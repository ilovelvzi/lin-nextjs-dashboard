"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import bcrypt from "bcrypt";
import sql from "@/app/lib/db";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}

export type RegisterState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
  message?: string | null;
};

const RegisterSchema = z.object({
  name: z.string().min(2, { message: "姓名至少需要2个字符。" }),
  email: z.string().email({ message: "请输入有效的邮箱地址。" }),
  password: z.string().min(6, { message: "密码至少需要6个字符。" }),
  confirmPassword: z.string().min(6, { message: "确认密码至少需要6个字符。" }),
});

export async function registerUser(
  prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const validatedFields = RegisterSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "表单验证失败，请检查输入。",
    };
  }

  const { name, email, password, confirmPassword } = validatedFields.data;

  if (password !== confirmPassword) {
    return {
      errors: { confirmPassword: ["两次输入的密码不一致。"] },
      message: "密码不匹配。",
    };
  }

  try {
    const existingUsers = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    if (existingUsers.length > 0) {
      return {
        errors: { email: ["该邮箱已被注册。"] },
        message: "邮箱已存在。",
      };
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (name, email, password)
      VALUES (${name}, ${email}, ${hashedPassword})
    `;
  } catch (error) {
    console.error("Database Error:", error);
    return { message: "数据库错误：注册失败，请稍后重试。" };
  }

  redirect("/login");
}

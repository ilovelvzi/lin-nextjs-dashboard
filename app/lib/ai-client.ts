import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  // baseURL: "http://localhost:11434/v1",
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

export default client;

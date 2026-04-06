import bcrypt from 'bcrypt';
import postgres from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

async function seedUsers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );

  return insertedUsers;
}

async function seedInvoices() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      customer_id UUID NOT NULL,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      (invoice) => sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedInvoices;
}

async function seedCustomers() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;

  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `,
    ),
  );

  return insertedCustomers;
}

async function seedRevenue() {
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `,
    ),
  );

  return insertedRevenue;
}

async function seedResumes() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS resumes (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL DEFAULT '未命名简历',
      original_content TEXT NOT NULL,
      optimized_content TEXT,
      job_description TEXT,
      score INTEGER DEFAULT 0,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
}

async function seedResumeSuggestions() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS resume_suggestions (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
      category VARCHAR(100) NOT NULL,
      original_text TEXT,
      suggested_text TEXT,
      reason TEXT,
      priority VARCHAR(20) DEFAULT 'medium',
      is_applied BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
}

async function seedResumeReports() {
  await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await sql`
    CREATE TABLE IF NOT EXISTS resume_reports (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
      overall_score INTEGER DEFAULT 0,
      content_score INTEGER DEFAULT 0,
      format_score INTEGER DEFAULT 0,
      keyword_score INTEGER DEFAULT 0,
      experience_score INTEGER DEFAULT 0,
      education_score INTEGER DEFAULT 0,
      summary TEXT,
      strengths TEXT[],
      weaknesses TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
}

export async function GET() {
  try {
    const result = await sql.begin((sql) => [
      seedUsers(),
      seedCustomers(),
      seedInvoices(),
      seedRevenue(),
      seedResumes(),
      seedResumeSuggestions(),
      seedResumeReports(),
    ]);

    return Response.json({ message: 'Database seeded successfully' });
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}

-- Initial Schema for PISM

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- Enums
CREATE TYPE "public"."SalePayment" AS ENUM ('installments', 'cash');

-- Tables
CREATE TABLE "public"."clients" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "name" text NOT NULL,
    "address" text NOT NULL,
    "city" text NOT NULL,
    "cep" text,
    "email" text,
    "phone" text,
    "state" text,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "user_id" uuid NOT NULL DEFAULT auth.uid(),
    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."products" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "name" text NOT NULL,
    "description" text,
    "price" numeric NOT NULL,
    "stock" integer NOT NULL DEFAULT 0,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "user_id" uuid NOT NULL DEFAULT auth.uid(),
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."sales" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "clientId" uuid,
    "dueDate" timestamp with time zone NOT NULL,
    "payment" "public"."SalePayment" NOT NULL DEFAULT 'cash'::"public"."SalePayment",
    "installments" integer DEFAULT 1,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "user_id" uuid NOT NULL DEFAULT auth.uid(),
    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."sale_items" (
    "id" uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
    "sale_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "quantity" integer NOT NULL DEFAULT 1,
    "price" numeric NOT NULL,
    "created_at" timestamp with time zone NOT NULL DEFAULT now(),
    "user_id" uuid NOT NULL DEFAULT auth.uid(),
    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys
ALTER TABLE "public"."clients" ADD CONSTRAINT "clients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES auth.users("id");
ALTER TABLE "public"."products" ADD CONSTRAINT "products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES auth.users("id");
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE SET NULL;
ALTER TABLE "public"."sales" ADD CONSTRAINT "sales_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES auth.users("id");
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;
ALTER TABLE "public"."sale_items" ADD CONSTRAINT "sale_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES auth.users("id");

-- Enable Row Level Security
ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."sale_items" ENABLE ROW LEVEL SECURITY;

-- Policies for clients
CREATE POLICY "Users can view their own clients" ON "public"."clients" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clients" ON "public"."clients" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own clients" ON "public"."clients" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clients" ON "public"."clients" FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for products
CREATE POLICY "Users can view their own products" ON "public"."products" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own products" ON "public"."products" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON "public"."products" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON "public"."products" FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for sales
CREATE POLICY "Users can view their own sales" ON "public"."sales" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sales" ON "public"."sales" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sales" ON "public"."sales" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sales" ON "public"."sales" FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Policies for sale_items
CREATE POLICY "Users can view their own sale_items" ON "public"."sale_items" FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sale_items" ON "public"."sale_items" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sale_items" ON "public"."sale_items" FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sale_items" ON "public"."sale_items" FOR DELETE TO authenticated USING (auth.uid() = user_id);

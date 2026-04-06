-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" TIMESTAMP(3),
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "contactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_userId_status_idx" ON "tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "tasks_userId_dueDate_idx" ON "tasks"("userId", "dueDate");

-- CreateIndex
CREATE INDEX "tasks_contactId_idx" ON "tasks"("contactId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

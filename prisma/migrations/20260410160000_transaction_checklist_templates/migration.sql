-- CreateEnum
CREATE TYPE "TransactionChecklistTemplateSide" AS ENUM ('BUY', 'SELL');

-- CreateTable
CREATE TABLE "transaction_checklist_templates" (
    "id" TEXT NOT NULL,
    "side" "TransactionChecklistTemplateSide" NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "transaction_checklist_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transaction_checklist_templates_side_key" ON "transaction_checklist_templates"("side");

-- CreateTable
CREATE TABLE "transaction_checklist_template_items" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "transaction_checklist_template_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_checklist_template_items_templateId_sortOrder_idx" ON "transaction_checklist_template_items"("templateId", "sortOrder");

-- AddForeignKey
ALTER TABLE "transaction_checklist_template_items" ADD CONSTRAINT "transaction_checklist_template_items_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "transaction_checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed reference templates (v1 defaults; idempotent on side)
INSERT INTO "transaction_checklist_templates" ("id", "side", "label") VALUES
('b2c3d4e5-f1a2-4000-a000-000000000001', 'BUY', 'Buy-side closing'),
('b2c3d4e5-f1a2-4000-a000-000000000002', 'SELL', 'Sell-side closing')
ON CONFLICT ("side") DO NOTHING;

INSERT INTO "transaction_checklist_template_items" ("id", "templateId", "sortOrder", "title") VALUES
('c1000000-0000-4000-a000-000000000001', 'b2c3d4e5-f1a2-4000-a000-000000000001', 1, 'Contract and earnest money in place'),
('c1000000-0000-4000-a000-000000000002', 'b2c3d4e5-f1a2-4000-a000-000000000001', 2, 'Inspection contingency tracked'),
('c1000000-0000-4000-a000-000000000003', 'b2c3d4e5-f1a2-4000-a000-000000000001', 3, 'Loan / financing and appraisal'),
('c1000000-0000-4000-a000-000000000004', 'b2c3d4e5-f1a2-4000-a000-000000000001', 4, 'Title review and insurance'),
('c1000000-0000-4000-a000-000000000005', 'b2c3d4e5-f1a2-4000-a000-000000000001', 5, 'HOA or condo docs (if applicable)'),
('c1000000-0000-4000-a000-000000000006', 'b2c3d4e5-f1a2-4000-a000-000000000001', 6, 'Final walkthrough scheduled'),
('c1000000-0000-4000-a000-000000000007', 'b2c3d4e5-f1a2-4000-a000-000000000001', 7, 'Closing disclosure reviewed'),
('c1000000-0000-4000-a000-000000000008', 'b2c3d4e5-f1a2-4000-a000-000000000001', 8, 'Closing and funding'),

('c2000000-0000-4000-a000-000000000001', 'b2c3d4e5-f1a2-4000-a000-000000000002', 1, 'Listing agreement and disclosures'),
('c2000000-0000-4000-a000-000000000002', 'b2c3d4e5-f1a2-4000-a000-000000000002', 2, 'Under contract / buyer contingencies'),
('c2000000-0000-4000-a000-000000000003', 'b2c3d4e5-f1a2-4000-a000-000000000002', 3, 'Buyer inspection response'),
('c2000000-0000-4000-a000-000000000004', 'b2c3d4e5-f1a2-4000-a000-000000000002', 4, 'Appraisal and repair negotiations'),
('c2000000-0000-4000-a000-000000000005', 'b2c3d4e5-f1a2-4000-a000-000000000002', 5, 'Title, payoff, and liens'),
('c2000000-0000-4000-a000-000000000006', 'b2c3d4e5-f1a2-4000-a000-000000000002', 6, 'HOA or transfer documents'),
('c2000000-0000-4000-a000-000000000007', 'b2c3d4e5-f1a2-4000-a000-000000000002', 7, 'Final walkthrough'),
('c2000000-0000-4000-a000-000000000008', 'b2c3d4e5-f1a2-4000-a000-000000000002', 8, 'Closing and proceeds');

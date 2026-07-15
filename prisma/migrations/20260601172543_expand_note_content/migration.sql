-- Expand Note.content from VARCHAR(191) to LONGTEXT to support rich text HTML
ALTER TABLE `Note` MODIFY COLUMN `content` LONGTEXT NOT NULL;

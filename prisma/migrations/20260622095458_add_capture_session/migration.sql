-- CreateTable
CREATE TABLE `CaptureSession` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `alerts` JSON NOT NULL,
    `iocs` JSON NOT NULL,
    `timeline` JSON NOT NULL,
    `mitre` JSON NOT NULL,
    `riskRanking` JSON NOT NULL,
    `attackStory` JSON NULL,
    `investigationPlan` JSON NULL,
    `executiveReport` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CaptureSession_projectId_key`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CaptureSession` ADD CONSTRAINT `CaptureSession_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

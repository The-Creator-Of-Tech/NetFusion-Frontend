-- Unified Timeline Schema Migration
-- Adds source, title, severity, executionId, investigationId to TimelineEntry

ALTER TABLE `TimelineEntry`
  ADD COLUMN `source`          VARCHAR(64) NOT NULL DEFAULT 'system',
  ADD COLUMN `title`           VARCHAR(255) NULL,
  ADD COLUMN `severity`        VARCHAR(16) NULL,
  ADD COLUMN `executionId`     VARCHAR(255) NULL,
  ADD COLUMN `investigationId` VARCHAR(255) NULL;

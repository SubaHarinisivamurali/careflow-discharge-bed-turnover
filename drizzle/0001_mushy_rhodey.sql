CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`recordId` varchar(96) NOT NULL,
	`userId` varchar(96) NOT NULL,
	`role` varchar(64) NOT NULL,
	`action` varchar(96) NOT NULL,
	`previousState` text NOT NULL,
	`newState` text NOT NULL,
	`reason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);

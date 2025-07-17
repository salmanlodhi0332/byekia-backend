-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jul 17, 2025 at 06:55 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `byekia_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `fcmtoken_table`
--

CREATE TABLE `fcmtoken_table` (
  `id` int(11) NOT NULL,
  `fcmtoken` varchar(255) DEFAULT NULL,
  `deviceID` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `creationDate` datetime DEFAULT NULL,
  `updatedDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notification_table`
--

CREATE TABLE `notification_table` (
  `id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `body` varchar(255) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `creationDate` datetime DEFAULT NULL,
  `updatedDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ride_config_table`
--

CREATE TABLE `ride_config_table` (
  `id` int(11) NOT NULL,
  `petrolPrice` int(11) DEFAULT NULL,
  `creationDate` datetime DEFAULT NULL,
  `updatedDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ride_details_table`
--

CREATE TABLE `ride_details_table` (
  `id` int(11) NOT NULL,
  `startPoint` varchar(255) DEFAULT NULL,
  `endPoint` varchar(255) DEFAULT NULL,
  `ridePrice` double DEFAULT NULL,
  `riderId` int(11) DEFAULT NULL,
  `userId` int(11) DEFAULT NULL,
  `creationDate` datetime DEFAULT NULL,
  `updatedDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ride_review_table`
--

CREATE TABLE `ride_review_table` (
  `id` int(11) NOT NULL,
  `rideId` int(11) DEFAULT NULL,
  `rating` double DEFAULT NULL,
  `review` varchar(255) DEFAULT NULL,
  `creationDate` datetime DEFAULT NULL,
  `updatedDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users_docs_table`
--

CREATE TABLE `users_docs_table` (
  `id` int(11) NOT NULL,
  `userId` int(11) DEFAULT NULL,
  `docs` varchar(255) DEFAULT NULL,
  `creationDate` datetime DEFAULT NULL,
  `updatedDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users_docs_table`
--

INSERT INTO `users_docs_table` (`id`, `userId`, `docs`, `creationDate`, `updatedDate`) VALUES
(1, 1, 'docs-1752770243701-988780109.png', '2025-07-17 21:37:23', '2025-07-17 21:37:23');

-- --------------------------------------------------------

--
-- Table structure for table `users_table`
--

CREATE TABLE `users_table` (
  `id` int(11) NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `userImage` varchar(255) DEFAULT NULL,
  `phone number` varchar(20) DEFAULT NULL,
  `userRole` enum('customer','rider','admin') DEFAULT NULL,
  `isVerified` int(11) DEFAULT NULL,
  `isActive` int(11) DEFAULT NULL,
  `creationDate` datetime DEFAULT NULL,
  `updatedDate` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users_table`
--

INSERT INTO `users_table` (`id`, `name`, `email`, `userImage`, `phone number`, `userRole`, `isVerified`, `isActive`, `creationDate`, `updatedDate`) VALUES
(1, 'John Doe', 'qxsasndq6c@mrotzis.com', 'userImage-1752770243700-674011364.jpg', '1234567890', 'customer', 1, 1, '2025-07-17 21:37:23', '2025-07-17 21:38:27');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `fcmtoken_table`
--
ALTER TABLE `fcmtoken_table`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `notification_table`
--
ALTER TABLE `notification_table`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `ride_config_table`
--
ALTER TABLE `ride_config_table`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `ride_details_table`
--
ALTER TABLE `ride_details_table`
  ADD PRIMARY KEY (`id`),
  ADD KEY `riderId` (`riderId`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `ride_review_table`
--
ALTER TABLE `ride_review_table`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rideId` (`rideId`);

--
-- Indexes for table `users_docs_table`
--
ALTER TABLE `users_docs_table`
  ADD PRIMARY KEY (`id`),
  ADD KEY `userId` (`userId`);

--
-- Indexes for table `users_table`
--
ALTER TABLE `users_table`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `fcmtoken_table`
--
ALTER TABLE `fcmtoken_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notification_table`
--
ALTER TABLE `notification_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ride_config_table`
--
ALTER TABLE `ride_config_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ride_details_table`
--
ALTER TABLE `ride_details_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ride_review_table`
--
ALTER TABLE `ride_review_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users_docs_table`
--
ALTER TABLE `users_docs_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users_table`
--
ALTER TABLE `users_table`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `fcmtoken_table`
--
ALTER TABLE `fcmtoken_table`
  ADD CONSTRAINT `fcmtoken_table_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users_table` (`id`);

--
-- Constraints for table `notification_table`
--
ALTER TABLE `notification_table`
  ADD CONSTRAINT `notification_table_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users_table` (`id`);

--
-- Constraints for table `ride_details_table`
--
ALTER TABLE `ride_details_table`
  ADD CONSTRAINT `ride_details_table_ibfk_1` FOREIGN KEY (`riderId`) REFERENCES `users_table` (`id`),
  ADD CONSTRAINT `ride_details_table_ibfk_2` FOREIGN KEY (`userId`) REFERENCES `users_table` (`id`);

--
-- Constraints for table `ride_review_table`
--
ALTER TABLE `ride_review_table`
  ADD CONSTRAINT `ride_review_table_ibfk_1` FOREIGN KEY (`rideId`) REFERENCES `ride_details_table` (`id`);

--
-- Constraints for table `users_docs_table`
--
ALTER TABLE `users_docs_table`
  ADD CONSTRAINT `users_docs_table_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users_table` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

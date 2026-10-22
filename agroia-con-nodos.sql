-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: agroia_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `alembic_version`
--

DROP TABLE IF EXISTS `alembic_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alembic_version` (
  `version_num` varchar(32) NOT NULL,
  PRIMARY KEY (`version_num`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alembic_version`
--

LOCK TABLES `alembic_version` WRITE;
/*!40000 ALTER TABLE `alembic_version` DISABLE KEYS */;
INSERT INTO `alembic_version` VALUES ('3fa07794160c');
/*!40000 ALTER TABLE `alembic_version` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alertas_config`
--

DROP TABLE IF EXISTS `alertas_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alertas_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parcela_id` int NOT NULL,
  `humedad_suelo_min` float NOT NULL,
  `temperatura_min` float NOT NULL,
  `correo_destino` varchar(255) DEFAULT NULL,
  `activa` tinyint(1) NOT NULL,
  `cooldown_minutos` int NOT NULL,
  `fecha_creacion` datetime NOT NULL,
  `fecha_actualizacion` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_alertas_config_parcela_id` (`parcela_id`),
  CONSTRAINT `alertas_config_ibfk_1` FOREIGN KEY (`parcela_id`) REFERENCES `parcelas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alertas_config`
--

LOCK TABLES `alertas_config` WRITE;
/*!40000 ALTER TABLE `alertas_config` DISABLE KEYS */;
INSERT INTO `alertas_config` VALUES (1,2,25,10,'carpep69@gmail.com',1,60,'2026-10-08 06:05:16','2026-10-08 07:20:24'),(2,3,25,10,NULL,1,60,'2026-10-08 06:31:22','2026-10-08 06:31:22');
/*!40000 ALTER TABLE `alertas_config` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `alertas_enviadas`
--

DROP TABLE IF EXISTS `alertas_enviadas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alertas_enviadas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parcela_id` int NOT NULL,
  `nodo_id` int DEFAULT NULL,
  `tipo_alerta` varchar(50) NOT NULL,
  `valor_detectado` float NOT NULL,
  `umbral` float NOT NULL,
  `mensaje` varchar(500) NOT NULL,
  `canal` varchar(30) NOT NULL,
  `destinatario` varchar(255) DEFAULT NULL,
  `estado` varchar(30) NOT NULL,
  `error_detalle` varchar(500) DEFAULT NULL,
  `fecha_deteccion` datetime NOT NULL,
  `fecha_envio` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nodo_id` (`nodo_id`),
  KEY `ix_alertas_enviadas_parcela_id` (`parcela_id`),
  CONSTRAINT `alertas_enviadas_ibfk_1` FOREIGN KEY (`nodo_id`) REFERENCES `nodos` (`id`),
  CONSTRAINT `alertas_enviadas_ibfk_2` FOREIGN KEY (`parcela_id`) REFERENCES `parcelas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `alertas_enviadas`
--

LOCK TABLES `alertas_enviadas` WRITE;
/*!40000 ALTER TABLE `alertas_enviadas` DISABLE KEYS */;
INSERT INTO `alertas_enviadas` VALUES (1,2,1,'suelo_seco',20,25,'Suelo seco en nodo ESP32-001: valor 20.0, umbral mínimo 25.0','correo',NULL,'pendiente',NULL,'2026-10-08 06:09:52',NULL),(2,2,NULL,'temperatura_baja',7,10,'Temperatura ambiental baja en parcela 2: valor 7.0, umbral mínimo 10.0','correo',NULL,'pendiente',NULL,'2026-10-08 06:09:52',NULL),(3,2,NULL,'temperatura_baja',7,10,'Temperatura ambiental baja en parcela 2: valor 7.0, umbral mínimo 10.0','correo',NULL,'pendiente',NULL,'2026-10-08 06:22:04',NULL),(4,2,1,'suelo_seco',20,25,'Suelo seco en nodo ESP32-001: valor 20.0, umbral mínimo 25.0','correo',NULL,'pendiente',NULL,'2026-10-08 06:22:04',NULL),(5,2,1,'suelo_seco',18,25,'PRUEBA CONTROLADA SMTP - AgroIA','correo','carpep69@gmail.com','enviada',NULL,'2026-10-08 06:58:02','2026-10-08 06:58:05'),(6,2,1,'suelo_seco',18,25,'PRUEBA AUTOMATICA DEL WORKER SMTP','correo','carpep69@gmail.com','enviada',NULL,'2026-10-08 07:11:54','2026-10-08 07:12:11'),(7,2,1,'suelo_seco',20,25,'Suelo seco en nodo ESP32-001: valor 20.0, umbral mínimo 25.0','correo','carpep69@gmail.com','enviada',NULL,'2026-10-08 07:20:24','2026-10-08 07:20:32'),(8,2,1,'suelo_seco',20,25,'Suelo seco en nodo ESP32-001: valor 20.0, umbral mínimo 25.0','correo','carpep69@gmail.com','fallida','Error SMTP: OSError','2026-10-08 17:43:45',NULL);
/*!40000 ALTER TABLE `alertas_enviadas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bitacora`
--

DROP TABLE IF EXISTS `bitacora`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bitacora` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `accion` varchar(255) NOT NULL,
  `nodo_id` int DEFAULT NULL,
  `fecha` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  KEY `nodo_id` (`nodo_id`),
  CONSTRAINT `bitacora_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `bitacora_ibfk_2` FOREIGN KEY (`nodo_id`) REFERENCES `nodos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bitacora`
--

LOCK TABLES `bitacora` WRITE;
/*!40000 ALTER TABLE `bitacora` DISABLE KEYS */;
INSERT INTO `bitacora` VALUES (1,1,'Ordenó rele = 1 en Nodo ESP32-001',1,'2026-10-07 06:14:45'),(2,1,'Ordenó rele = 1 en Nodo ESP32-001',1,'2026-10-07 06:32:43'),(3,1,'Ordenó rele = 0 en Nodo ESP32-001',1,'2026-10-07 06:35:37'),(4,1,'Ordenó rele = 1 en Nodo ESP32-001',1,'2026-10-08 04:57:40'),(5,1,'Estación estacion confirmó comando 4: rele = 1 en Nodo ESP32-001',1,'2026-10-08 04:58:02'),(6,1,'Ordenó rele = 0 en Nodo ESP32-001',1,'2026-10-08 05:02:01'),(7,1,'Ordenó rele = 0 en Nodo ESP32-001',1,'2026-10-08 05:02:01'),(8,1,'Estación estacion confirmó comando 5: rele = 0 en Nodo ESP32-001',1,'2026-10-08 05:02:14'),(9,1,'Estación estacion confirmó comando 6: rele = 0 en Nodo ESP32-001',1,'2026-10-08 05:02:14');
/*!40000 ALTER TABLE `bitacora` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comandos_pendientes`
--

DROP TABLE IF EXISTS `comandos_pendientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comandos_pendientes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nodo_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `tipo_comando` enum('riego','rele') NOT NULL,
  `valor` varchar(50) NOT NULL,
  `ejecutado` tinyint(1) DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `fecha_ejecucion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `nodo_id` (`nodo_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `comandos_pendientes_ibfk_1` FOREIGN KEY (`nodo_id`) REFERENCES `nodos` (`id`),
  CONSTRAINT `comandos_pendientes_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comandos_pendientes`
--

LOCK TABLES `comandos_pendientes` WRITE;
/*!40000 ALTER TABLE `comandos_pendientes` DISABLE KEYS */;
INSERT INTO `comandos_pendientes` VALUES (4,1,1,'rele','1',1,'2026-10-08 04:57:40','2026-10-08 04:58:02'),(5,1,1,'rele','0',1,'2026-10-08 05:02:01','2026-10-08 05:02:14'),(6,1,1,'rele','0',1,'2026-10-08 05:02:01','2026-10-08 05:02:14');
/*!40000 ALTER TABLE `comandos_pendientes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nodos`
--

DROP TABLE IF EXISTS `nodos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nodos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `parcela_id` int NOT NULL,
  `identificador` varchar(50) NOT NULL,
  `api_key` varchar(255) NOT NULL,
  `estado` enum('activo','inactivo','mantenimiento') DEFAULT NULL,
  `tipo` enum('estacion','sensor_suelo') NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `identificador` (`identificador`),
  UNIQUE KEY `api_key` (`api_key`),
  KEY `parcela_id` (`parcela_id`),
  CONSTRAINT `nodos_ibfk_1` FOREIGN KEY (`parcela_id`) REFERENCES `parcelas` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nodos`
--

LOCK TABLES `nodos` WRITE;
/*!40000 ALTER TABLE `nodos` DISABLE KEYS */;
INSERT INTO `nodos` VALUES (1,2,'ESP32-001','7eb3bc31fcd0b7b5f62b380d2972548cfc5658e59f398e14','activo','sensor_suelo'),(4,2,'estacion','d10e7f4332da926e764ce713f624ea0eb27bcf2f1da24754','activo','estacion'),(5,2,'1','37a7f5d65b6af58b3a38c7ae28e82ba537ed826d294a5b79','activo','sensor_suelo'),(6,2,'2','45e0d883862855a4e8aa893435f008fc1b39b6e9aa4569a6','activo','sensor_suelo'),(7,2,'3','5e9b2e17b17bd26e14cb0dbd7e1f065c00b9af33ff07ab24','activo','sensor_suelo'),(8,2,'4','a0c32e6a66b8a8e98fb30e60433eb2ece774b8670570a8be','activo','sensor_suelo');
/*!40000 ALTER TABLE `nodos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parcelas`
--

DROP TABLE IF EXISTS `parcelas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parcelas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `ubicacion` varchar(150) DEFAULT NULL,
  `usuario_id` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `parcelas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parcelas`
--

LOCK TABLES `parcelas` WRITE;
/*!40000 ALTER TABLE `parcelas` DISABLE KEYS */;
INSERT INTO `parcelas` VALUES (1,'Parcela Usuario A','Hermosillo',3),(2,'Parcela Usuario B','Hermosillo',3),(3,'Parcela 1','Valle del Yaqui, Sonora',4);
/*!40000 ALTER TABLE `parcelas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens_revocados`
--

DROP TABLE IF EXISTS `tokens_revocados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens_revocados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `jti` varchar(36) NOT NULL,
  `fecha_revocacion` datetime NOT NULL,
  `fecha_expiracion` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_tokens_revocados_jti` (`jti`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens_revocados`
--

LOCK TABLES `tokens_revocados` WRITE;
/*!40000 ALTER TABLE `tokens_revocados` DISABLE KEYS */;
INSERT INTO `tokens_revocados` VALUES (1,'f02b1b84-8bbe-4cc4-a286-bd32428f0667','2026-10-08 09:01:02','2026-10-08 09:15:35'),(2,'8ec827ea-5476-476d-b484-f232de88347a','2026-10-22 07:08:59','2026-10-22 07:21:34');
/*!40000 ALTER TABLE `tokens_revocados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(150) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('admin','agricultor') NOT NULL,
  `fecha_creacion` datetime DEFAULT NULL,
  `activo` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Admin','admin@agroia.com','scrypt:32768:8:1$G4s2Yvl07ZQM6ocm$3900381bcd94ba79eb44936eeeddd4be5411ec9d3d12305fddcb9fafa1cf5bd8d4be37166088aa9e294341d1cc38d09d2e7580dc9bc15be987eb533af5c20c44','admin','2026-10-01 05:42:33',1),(2,'Jose Agricultor','jose@agroia.com','scrypt:32768:8:1$2TAouWiKQr0GIDZD$e16628fb99585943140148633a1a70147557e2e5d922f83b9ee1abd8bce00b73140b9fc36be8fa8988da2e5a177d269285babe78794fc2f9d296d7e8bb03d3bf','agricultor','2026-10-01 05:55:31',1),(3,'Victor Agricultora','victor@agroia.com','scrypt:32768:8:1$cIvn5KGdIntc3PqU$82880b60df7d93782aa12d96632b9c42cc0c69b57dc04c9560da587ea939eb524e9e703d94a7bb6b2d36e5223aeb9e832fc815d42d03f5ddc175327d1441983f','agricultor','2026-10-01 05:55:31',1),(4,'Agricultor Piloto','agricultor@agroia.com','scrypt:32768:8:1$TQesH7nQntN5pAuM$2a7b2fccb809a0ab376d2437e8073ded29d948404935ed367e220268a4c0d0fdab2a225052a8472fb3169ac8341cbfb37cbaf214d6d2e1202655f3b5813e6117','agricultor','2026-10-01 08:39:57',1),(5,'Juan Carlos','carpep69@gmail.com','scrypt:32768:8:1$m44f4o4HuhA4wuEg$376fc3466a9df6cda8aa7d24e215a98dfe9add9109f42d01f6bfba1808b9b03b68a561d712441a86c7ef303cc3675b15aa7b092c8ba31002070bf33e6564718e','agricultor','2026-10-22 07:08:49',1);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-22  7:44:29

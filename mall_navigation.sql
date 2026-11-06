/*
 Navicat Premium Dump SQL

 Source Server         : 商业空间管理与智能导航系统
 Source Server Type    : MySQL
 Source Server Version : 80045 (8.0.45)
 Source Host           : localhost:3306
 Source Schema         : mall_navigation

 Target Server Type    : MySQL
 Target Server Version : 80045 (8.0.45)
 File Encoding         : 65001

 Date: 23/09/2026 15:19:26
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for account_shop
-- ----------------------------
DROP TABLE IF EXISTS `account_shop`;
CREATE TABLE `account_shop`  (
  `mall_id` bigint UNSIGNED NOT NULL,
  `account_id` bigint UNSIGNED NOT NULL,
  `shop_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`account_id`, `shop_id`) USING BTREE,
  INDEX `fk_access_account`(`mall_id` ASC, `account_id` ASC) USING BTREE,
  INDEX `fk_access_shop`(`mall_id` ASC, `shop_id` ASC) USING BTREE,
  CONSTRAINT `fk_access_account` FOREIGN KEY (`mall_id`, `account_id`) REFERENCES `backend_account` (`mall_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_access_shop` FOREIGN KEY (`mall_id`, `shop_id`) REFERENCES `shop` (`mall_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '账号可管理的店铺，多对多授权关系' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of account_shop
-- ----------------------------

-- ----------------------------
-- Table structure for backend_account
-- ----------------------------
DROP TABLE IF EXISTS `backend_account`;
CREATE TABLE `backend_account`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `mall_id` bigint UNSIGNED NOT NULL,
  `username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '应用层生成Argon2id或bcrypt哈希，不存明文',
  `display_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `role` enum('MALL_ADMIN','MERCHANT') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'MERCHANT',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_account_username`(`username` ASC) USING BTREE,
  UNIQUE INDEX `uk_account_mall_id`(`mall_id` ASC, `id` ASC) USING BTREE,
  CONSTRAINT `fk_account_mall` FOREIGN KEY (`mall_id`) REFERENCES `mall` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_account_active` CHECK (`is_active` in (0,1))
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = 'To B账号，第一版To C匿名使用' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of backend_account
-- ----------------------------

-- ----------------------------
-- Table structure for mall
-- ----------------------------
DROP TABLE IF EXISTS `mall`;
CREATE TABLE `mall`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '商场名称',
  `address` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '商场' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mall
-- ----------------------------
INSERT INTO `mall` VALUES (1, '上海正大广场', NULL, '2026-09-21 10:47:46');

-- ----------------------------
-- Table structure for mall_floor
-- ----------------------------
DROP TABLE IF EXISTS `mall_floor`;
CREATE TABLE `mall_floor`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `mall_id` bigint UNSIGNED NOT NULL,
  `floor_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '例如B1、1F、2F',
  `sort_order` int NOT NULL COMMENT '楼层排序；地下层可用负数',
  `svg_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT 'SVG静态资源地址或相对路径',
  `viewbox_min_x` decimal(12, 3) NOT NULL DEFAULT 0.000,
  `viewbox_min_y` decimal(12, 3) NOT NULL DEFAULT 0.000,
  `map_width` decimal(12, 3) NULL DEFAULT NULL COMMENT 'viewBox宽；未上传地图时为空',
  `map_height` decimal(12, 3) NULL DEFAULT NULL COMMENT 'viewBox高；未上传地图时为空',
  `meters_per_unit` decimal(12, 6) NULL DEFAULT NULL COMMENT '可选：经标定的每SVG单位米数',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_floor_code`(`mall_id` ASC, `floor_code` ASC) USING BTREE,
  UNIQUE INDEX `uk_floor_mall_id`(`mall_id` ASC, `id` ASC) USING BTREE,
  CONSTRAINT `fk_floor_mall` FOREIGN KEY (`mall_id`) REFERENCES `mall` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_floor_scale` CHECK ((`meters_per_unit` is null) or (`meters_per_unit` > 0)),
  CONSTRAINT `ck_floor_size` CHECK (((`map_width` is null) and (`map_height` is null)) or ((`map_width` is not null) and (`map_height` is not null) and (`map_width` > 0) and (`map_height` > 0)))
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '楼层及地图坐标配置' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mall_floor
-- ----------------------------
INSERT INTO `mall_floor` VALUES (1, 1, 'B2', -2, NULL, 0.000, 0.000, NULL, NULL, NULL, '2026-09-21 10:47:46');
INSERT INTO `mall_floor` VALUES (2, 1, 'B1', -1, NULL, 0.000, 0.000, NULL, NULL, NULL, '2026-09-21 10:47:46');
INSERT INTO `mall_floor` VALUES (3, 1, '1F', 1, 'level-1.svg', 0.000, 0.000, 1000.000, 650.000, NULL, '2026-09-21 10:47:46');
INSERT INTO `mall_floor` VALUES (4, 1, '2F', 2, NULL, 0.000, 0.000, NULL, NULL, NULL, '2026-09-21 10:47:46');
INSERT INTO `mall_floor` VALUES (5, 1, '3F', 3, NULL, 0.000, 0.000, NULL, NULL, NULL, '2026-09-21 10:47:46');
INSERT INTO `mall_floor` VALUES (6, 1, '4F', 4, NULL, 0.000, 0.000, NULL, NULL, NULL, '2026-09-21 10:47:46');
INSERT INTO `mall_floor` VALUES (7, 1, '5F', 5, NULL, 0.000, 0.000, NULL, NULL, NULL, '2026-09-21 10:47:46');
INSERT INTO `mall_floor` VALUES (8, 1, '7F', 7, NULL, 0.000, 0.000, NULL, NULL, NULL, '2026-09-21 10:47:46');

-- ----------------------------
-- Table structure for mall_traffic_stat
-- ----------------------------
DROP TABLE IF EXISTS `mall_traffic_stat`;
CREATE TABLE `mall_traffic_stat`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `mall_id` bigint UNSIGNED NOT NULL,
  `bucket_start` datetime NOT NULL COMMENT '北京时间，固定5分钟窗口起点，左闭右开',
  `data_source` enum('SIMULATED','REAL') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'SIMULATED',
  `entered_count` int UNSIGNED NOT NULL COMMENT '本窗口进入人次，不是去重人数',
  `exited_count` int UNSIGNED NOT NULL COMMENT '本窗口离开人次',
  `occupancy_count` int UNSIGNED NULL DEFAULT NULL COMMENT '窗口结束时场内人数快照；未知填NULL',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_mall_traffic_bucket`(`mall_id` ASC, `data_source` ASC, `bucket_start` ASC) USING BTREE,
  CONSTRAINT `fk_mall_traffic_mall` FOREIGN KEY (`mall_id`) REFERENCES `mall` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_mall_bucket` CHECK ((second(`bucket_start`) = 0) and ((minute(`bucket_start`) % 5) = 0))
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '商场整体客流，每商场每数据来源每5分钟一条' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of mall_traffic_stat
-- ----------------------------

-- ----------------------------
-- Table structure for nav_edge
-- ----------------------------
DROP TABLE IF EXISTS `nav_edge`;
CREATE TABLE `nav_edge`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `mall_id` bigint UNSIGNED NOT NULL,
  `from_node_id` bigint UNSIGNED NOT NULL COMMENT '有向边起点',
  `to_node_id` bigint UNSIGNED NOT NULL COMMENT '有向边终点',
  `edge_type` enum('WALK','ELEVATOR','ESCALATOR','STAIRS') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'WALK',
  `travel_seconds` decimal(10, 2) NOT NULL COMMENT '寻路权重：预计秒数，电梯含等待时间',
  `distance_m` decimal(10, 3) NULL DEFAULT NULL COMMENT '已标定实际距离；未知填NULL，不能拿SVG单位冒充米',
  `is_accessible` tinyint NOT NULL DEFAULT 1 COMMENT '是否可供轮椅通行',
  `is_active` tinyint NOT NULL DEFAULT 1 COMMENT '关闭后寻路不使用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_edge_direction`(`from_node_id` ASC, `to_node_id` ASC) USING BTREE,
  INDEX `idx_edge_to`(`to_node_id` ASC) USING BTREE,
  INDEX `idx_edge_mall_active`(`mall_id` ASC, `is_active` ASC) USING BTREE,
  INDEX `fk_edge_from`(`mall_id` ASC, `from_node_id` ASC) USING BTREE,
  INDEX `fk_edge_to`(`mall_id` ASC, `to_node_id` ASC) USING BTREE,
  CONSTRAINT `fk_edge_from` FOREIGN KEY (`mall_id`, `from_node_id`) REFERENCES `nav_node` (`mall_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_edge_to` FOREIGN KEY (`mall_id`, `to_node_id`) REFERENCES `nav_node` (`mall_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_edge_accessible` CHECK ((`edge_type` not in (_utf8mb4'STAIRS',_utf8mb4'ESCALATOR')) or (`is_accessible` = 0)),
  CONSTRAINT `ck_edge_different` CHECK (`from_node_id` <> `to_node_id`),
  CONSTRAINT `ck_edge_distance` CHECK ((`distance_m` is null) or (`distance_m` >= 0)),
  CONSTRAINT `ck_edge_flags` CHECK ((`is_accessible` in (0,1)) and (`is_active` in (0,1))),
  CONSTRAINT `ck_edge_time` CHECK (`travel_seconds` > 0)
) ENGINE = InnoDB AUTO_INCREMENT = 403 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '有向导航边；双向通道写两行，不自动连线' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of nav_edge
-- ----------------------------
INSERT INTO `nav_edge` VALUES (129, 1, 47, 16, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (130, 1, 48, 49, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (131, 1, 49, 50, 'WALK', 1.70, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (132, 1, 49, 6, 'WALK', 1.37, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (133, 1, 50, 51, 'WALK', 4.95, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (134, 1, 51, 52, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (135, 1, 52, 53, 'WALK', 5.91, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (136, 1, 53, 54, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (137, 1, 54, 55, 'WALK', 2.68, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (138, 1, 55, 18, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (139, 1, 56, 20, 'WALK', 2.40, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (140, 1, 8, 12, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (141, 1, 8, 3, 'WALK', 1.91, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (142, 1, 7, 9, 'WALK', 1.24, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (143, 1, 7, 10, 'WALK', 2.18, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (144, 1, 9, 10, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (145, 1, 10, 11, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (146, 1, 10, 6, 'WALK', 1.20, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (147, 1, 11, 6, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (148, 1, 11, 19, 'WALK', 6.44, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (149, 1, 12, 3, 'WALK', 1.01, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (150, 1, 12, 2, 'WALK', 3.31, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (151, 1, 13, 47, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (152, 1, 13, 4, 'WALK', 2.57, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (153, 1, 13, 21, 'WALK', 9.21, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (154, 1, 5, 14, 'WALK', 1.24, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (155, 1, 5, 4, 'WALK', 10.82, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (156, 1, 5, 21, 'WALK', 1.14, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (157, 1, 14, 48, 'WALK', 1.60, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (158, 1, 14, 21, 'WALK', 1.55, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (159, 1, 6, 49, 'WALK', 1.37, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (160, 1, 6, 19, 'WALK', 6.81, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (161, 1, 15, 17, 'WALK', 1.78, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (162, 1, 15, 18, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (163, 1, 3, 2, 'WALK', 2.59, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (164, 1, 3, 20, 'WALK', 4.99, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (165, 1, 2, 1, 'WALK', 5.47, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (166, 1, 1, 20, 'WALK', 1.97, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (167, 1, 4, 56, 'WALK', 2.16, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (168, 1, 17, 18, 'WALK', 1.49, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (169, 1, 93, 94, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (170, 1, 94, 63, 'WALK', 1.08, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (171, 1, 95, 73, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (172, 1, 96, 91, 'WALK', 1.82, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (173, 1, 97, 98, 'WALK', 1.70, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (174, 1, 98, 90, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (175, 1, 99, 100, 'WALK', 1.13, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (176, 1, 100, 101, 'WALK', 2.53, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (177, 1, 101, 102, 'WALK', 1.13, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (178, 1, 102, 103, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (179, 1, 103, 68, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (180, 1, 62, 93, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (181, 1, 63, 64, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (182, 1, 63, 66, 'WALK', 2.40, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (183, 1, 64, 65, 'WALK', 3.73, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (184, 1, 64, 66, 'WALK', 2.84, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (185, 1, 65, 73, 'WALK', 4.26, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (186, 1, 66, 99, 'WALK', 1.26, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (187, 1, 67, 69, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (188, 1, 67, 72, 'WALK', 1.85, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (189, 1, 69, 95, 'WALK', 1.97, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (190, 1, 69, 72, 'WALK', 1.99, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (191, 1, 70, 71, 'WALK', 2.13, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (192, 1, 70, 79, 'WALK', 2.76, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (193, 1, 70, 80, 'WALK', 2.64, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (194, 1, 71, 80, 'WALK', 1.67, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (195, 1, 71, 85, 'WALK', 2.70, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (196, 1, 73, 76, 'WALK', 1.11, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (197, 1, 73, 77, 'WALK', 1.37, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (198, 1, 74, 75, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (199, 1, 74, 83, 'WALK', 2.81, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (200, 1, 75, 83, 'WALK', 2.20, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (201, 1, 76, 81, 'WALK', 1.06, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (202, 1, 76, 82, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (203, 1, 77, 82, 'WALK', 1.47, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (204, 1, 78, 83, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (205, 1, 78, 89, 'WALK', 2.38, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (206, 1, 79, 80, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (207, 1, 81, 82, 'WALK', 1.17, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (208, 1, 81, 84, 'WALK', 1.31, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (209, 1, 83, 89, 'WALK', 1.84, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (210, 1, 83, 91, 'WALK', 1.91, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (211, 1, 84, 87, 'WALK', 2.27, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (212, 1, 85, 97, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (213, 1, 85, 88, 'WALK', 2.59, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (214, 1, 86, 96, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (215, 1, 87, 88, 'WALK', 2.57, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (216, 1, 89, 90, 'WALK', 2.04, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (217, 1, 89, 91, 'WALK', 1.45, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (218, 1, 90, 91, 'WALK', 3.48, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (256, 1, 16, 47, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (257, 1, 49, 48, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (258, 1, 50, 49, 'WALK', 1.70, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (259, 1, 51, 50, 'WALK', 4.95, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (260, 1, 52, 51, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (261, 1, 53, 52, 'WALK', 5.91, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (262, 1, 54, 53, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (263, 1, 55, 54, 'WALK', 2.68, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (264, 1, 18, 55, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (265, 1, 20, 56, 'WALK', 2.40, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (266, 1, 12, 8, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (267, 1, 3, 8, 'WALK', 1.91, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (268, 1, 9, 7, 'WALK', 1.24, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (269, 1, 10, 7, 'WALK', 2.18, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (270, 1, 10, 9, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (271, 1, 11, 10, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (272, 1, 6, 10, 'WALK', 1.20, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (273, 1, 6, 11, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (274, 1, 19, 11, 'WALK', 6.44, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (275, 1, 3, 12, 'WALK', 1.01, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (276, 1, 2, 12, 'WALK', 3.31, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (277, 1, 47, 13, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (278, 1, 4, 13, 'WALK', 2.57, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (279, 1, 21, 13, 'WALK', 9.21, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (280, 1, 14, 5, 'WALK', 1.24, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (281, 1, 4, 5, 'WALK', 10.82, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (282, 1, 21, 5, 'WALK', 1.14, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (283, 1, 48, 14, 'WALK', 1.60, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (284, 1, 21, 14, 'WALK', 1.55, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (285, 1, 19, 6, 'WALK', 6.81, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (286, 1, 17, 15, 'WALK', 1.78, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (287, 1, 18, 15, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (288, 1, 2, 3, 'WALK', 2.59, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (289, 1, 20, 3, 'WALK', 4.99, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (290, 1, 1, 2, 'WALK', 5.47, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (291, 1, 20, 1, 'WALK', 1.97, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (292, 1, 56, 4, 'WALK', 2.16, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (293, 1, 18, 17, 'WALK', 1.49, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (294, 1, 94, 93, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (295, 1, 63, 94, 'WALK', 1.08, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (296, 1, 73, 95, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (297, 1, 91, 96, 'WALK', 1.82, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (298, 1, 98, 97, 'WALK', 1.70, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (299, 1, 90, 98, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (300, 1, 100, 99, 'WALK', 1.13, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (301, 1, 101, 100, 'WALK', 2.53, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (302, 1, 102, 101, 'WALK', 1.13, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (303, 1, 103, 102, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (304, 1, 68, 103, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (305, 1, 93, 62, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (306, 1, 64, 63, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (307, 1, 66, 63, 'WALK', 2.40, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (308, 1, 65, 64, 'WALK', 3.73, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (309, 1, 66, 64, 'WALK', 2.84, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (310, 1, 73, 65, 'WALK', 4.26, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (311, 1, 99, 66, 'WALK', 1.26, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (312, 1, 69, 67, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (313, 1, 72, 67, 'WALK', 1.85, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (314, 1, 95, 69, 'WALK', 1.97, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (315, 1, 72, 69, 'WALK', 1.99, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (316, 1, 71, 70, 'WALK', 2.13, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (317, 1, 79, 70, 'WALK', 2.76, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (318, 1, 80, 70, 'WALK', 2.64, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (319, 1, 80, 71, 'WALK', 1.67, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (320, 1, 85, 71, 'WALK', 2.70, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (321, 1, 76, 73, 'WALK', 1.11, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (322, 1, 77, 73, 'WALK', 1.37, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (323, 1, 75, 74, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (324, 1, 83, 74, 'WALK', 2.81, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (325, 1, 83, 75, 'WALK', 2.20, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (326, 1, 81, 76, 'WALK', 1.06, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (327, 1, 82, 76, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (328, 1, 82, 77, 'WALK', 1.47, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (329, 1, 83, 78, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (330, 1, 89, 78, 'WALK', 2.38, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (331, 1, 80, 79, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (332, 1, 82, 81, 'WALK', 1.17, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (333, 1, 84, 81, 'WALK', 1.31, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (334, 1, 89, 83, 'WALK', 1.84, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (335, 1, 91, 83, 'WALK', 1.91, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (336, 1, 87, 84, 'WALK', 2.27, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (337, 1, 97, 85, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (338, 1, 88, 85, 'WALK', 2.59, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (339, 1, 96, 86, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (340, 1, 88, 87, 'WALK', 2.57, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (341, 1, 90, 89, 'WALK', 2.04, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (342, 1, 91, 89, 'WALK', 1.45, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (343, 1, 91, 90, 'WALK', 3.48, NULL, 1, 1, '2026-09-22 14:13:56');
INSERT INTO `nav_edge` VALUES (383, 1, 108, 4, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (384, 1, 109, 9, 'WALK', 1.43, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (385, 1, 110, 7, 'WALK', 2.39, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (386, 1, 111, 68, 'WALK', 1.27, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (387, 1, 112, 78, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (388, 1, 113, 74, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (390, 1, 4, 108, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (391, 1, 9, 109, 'WALK', 1.43, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (392, 1, 7, 110, 'WALK', 2.39, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (393, 1, 68, 111, 'WALK', 1.27, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (394, 1, 78, 112, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (395, 1, 74, 113, 'WALK', 1.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (397, 1, 108, 111, 'ELEVATOR', 45.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (398, 1, 109, 112, 'ELEVATOR', 45.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (399, 1, 110, 113, 'ELEVATOR', 45.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (400, 1, 111, 108, 'ELEVATOR', 45.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (401, 1, 112, 109, 'ELEVATOR', 45.00, NULL, 1, 1, '2026-09-22 14:54:37');
INSERT INTO `nav_edge` VALUES (402, 1, 113, 110, 'ELEVATOR', 45.00, NULL, 1, 1, '2026-09-22 14:54:37');

-- ----------------------------
-- Table structure for nav_node
-- ----------------------------
DROP TABLE IF EXISTS `nav_node`;
CREATE TABLE `nav_node`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `mall_id` bigint UNSIGNED NOT NULL,
  `floor_id` bigint UNSIGNED NOT NULL,
  `node_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '楼层内唯一，例如SHOP_001、LIFT_A',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `node_type` enum('SHOP','CORRIDOR','ELEVATOR','ESCALATOR','STAIRS','ENTRANCE') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `x` decimal(12, 3) NOT NULL COMMENT '左下角原点，向右为正，SVG单位',
  `y` decimal(12, 3) NOT NULL COMMENT '左下角原点，向上为正，SVG单位',
  `connector_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '同一竖向设施跨楼层共用编号，例如LIFT_A',
  `svg_element_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '可选：后续标注SVG元素id',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_node_code`(`floor_id` ASC, `node_code` ASC) USING BTREE,
  UNIQUE INDEX `uk_node_mall_id`(`mall_id` ASC, `id` ASC) USING BTREE,
  UNIQUE INDEX `uk_node_floor_id`(`floor_id` ASC, `id` ASC) USING BTREE,
  INDEX `idx_node_connector`(`mall_id` ASC, `connector_code` ASC) USING BTREE,
  INDEX `fk_node_floor`(`mall_id` ASC, `floor_id` ASC) USING BTREE,
  CONSTRAINT `fk_node_floor` FOREIGN KEY (`mall_id`, `floor_id`) REFERENCES `mall_floor` (`mall_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_node_active` CHECK (`is_active` in (0,1)),
  CONSTRAINT `ck_node_connector` CHECK ((`node_type` not in (_utf8mb4'ELEVATOR',_utf8mb4'ESCALATOR',_utf8mb4'STAIRS')) or ((`connector_code` is not null) and (char_length(trim(`connector_code`)) > 0))),
  CONSTRAINT `ck_node_xy` CHECK ((`x` >= 0) and (`y` >= 0))
) ENGINE = InnoDB AUTO_INCREMENT = 115 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '导航节点，含店铺、走廊和电梯各层停靠点' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of nav_node
-- ----------------------------
INSERT INTO `nav_node` VALUES (1, 1, 3, 'SHOP_CP-1F-001', '始祖鸟', 'SHOP', 785.570, 173.118, NULL, 'NODE_1F_SHOP_14', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (2, 1, 3, 'SHOP_CP-1F-002', 'DESCENTE', 'SHOP', 662.552, 113.548, NULL, 'NODE_1F_SHOP_13', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (3, 1, 3, 'SHOP_CP-1F-003', '丝芙兰(Sephora)', 'SHOP', 633.880, 171.582, NULL, 'NODE_1F_SHOP_12', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (4, 1, 3, 'SHOP_CP-1F-004', '华为', 'SHOP', 716.945, 312.641, NULL, 'NODE_1F_SHOP_15', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (5, 1, 3, 'SHOP_CP-1F-005', 'CHOW TAI FOOK 周大福', 'SHOP', 459.451, 395.658, NULL, 'NODE_1F_SHOP_08', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (6, 1, 3, 'SHOP_CP-1F-006', 'CHJ JEWELLERY 潮宏基', 'SHOP', 381.521, 341.444, NULL, 'NODE_1F_SHOP_10', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (7, 1, 3, 'SHOP_CP-1F-007', 'Lavazza', 'SHOP', 299.757, 324.459, NULL, 'NODE_1F_SHOP_02', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (8, 1, 3, 'SHOP_CP-1F-SVG-001', 'COLNAGO', 'SHOP', 587.805, 184.041, NULL, 'NODE_1F_SHOP_01', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (9, 1, 3, 'SHOP_CP-1F-SVG-003', 'Luk Fook Jewellery 六福珠', 'SHOP', 326.963, 339.357, NULL, 'NODE_1F_SHOP_03', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (10, 1, 3, 'SHOP_CP-1F-SVG-004', 'CHOW TAI SENG 周大生', 'SHOP', 351.567, 341.374, NULL, 'NODE_1F_SHOP_04', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (11, 1, 3, 'SHOP_CP-1F-SVG-005', 'CHOW TAI SENG', 'SHOP', 372.373, 345.027, NULL, 'NODE_1F_SHOP_05', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (12, 1, 3, 'SHOP_CP-1F-SVG-006', '瑞幸咖啡 LUCKIN COFFEE', 'SHOP', 609.110, 176.620, NULL, 'NODE_1F_SHOP_06', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (13, 1, 3, 'SHOP_CP-1F-SVG-007', 'LACOSTE', 'SHOP', 653.648, 301.673, NULL, 'NODE_1F_SHOP_07', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (14, 1, 3, 'SHOP_CP-1F-SVG-009', 'Chow Sang Sang 周生生', 'SHOP', 428.785, 399.342, NULL, 'NODE_1F_SHOP_09', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (15, 1, 3, 'SHOP_CP-1F-SVG-011', 'LOKAL By Wagas', 'SHOP', 413.553, 255.915, NULL, 'NODE_1F_SHOP_11', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (16, 1, 3, 'SHOP_CP-1F-SVG-016', 'KEEP LOOKING', 'SHOP', 635.968, 297.578, NULL, 'NODE_1F_SHOP_16', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (17, 1, 3, 'SHOP_CP-1F-SVG-017', 'FLOWER PLUS 花加', 'SHOP', 385.923, 220.979, NULL, 'NODE_1F_SHOP_17', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (18, 1, 3, 'SHOP_CP-1F-SVG-018', 'Green&Safe', 'SHOP', 398.732, 255.881, NULL, 'NODE_1F_SHOP_18', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (19, 1, 3, 'SHOP_CP-1F-SVG-019', 'Heiseiya 平成屋', 'SHOP', 254.169, 454.495, NULL, 'NODE_1F_SHOP_19', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (20, 1, 3, 'SHOP_CP-1F-SVG-020', 'ICICLE 之禾', 'SHOP', 752.707, 209.950, NULL, 'NODE_1F_SHOP_20', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (21, 1, 3, 'SHOP_CP-1F-SVG-021', 'manner', 'SHOP', 458.637, 424.036, NULL, 'NODE_1F_SHOP_21', 1, '2026-09-21 15:30:25');
INSERT INTO `nav_node` VALUES (47, 1, 3, 'COR_1F_01', '1F绕行拐点01', 'CORRIDOR', 645.000, 315.000, NULL, 'COR_1F_01', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (48, 1, 3, 'COR_1F_02', '1F绕行拐点02', 'CORRIDOR', 390.000, 390.000, NULL, 'COR_1F_02', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (49, 1, 3, 'COR_1F_03', '1F绕行拐点03', 'CORRIDOR', 375.000, 375.000, NULL, 'COR_1F_03', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (50, 1, 3, 'COR_1F_04', '1F绕行拐点04', 'CORRIDOR', 405.000, 405.000, NULL, 'COR_1F_04', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (51, 1, 3, 'COR_1F_05', '1F绕行拐点05', 'CORRIDOR', 525.000, 375.000, NULL, 'COR_1F_05', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (52, 1, 3, 'COR_1F_06', '1F绕行拐点06', 'CORRIDOR', 540.000, 360.000, NULL, 'COR_1F_06', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (53, 1, 3, 'COR_1F_07', '1F绕行拐点07', 'CORRIDOR', 480.000, 225.000, NULL, 'COR_1F_07', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (54, 1, 3, 'COR_1F_08', '1F绕行拐点08', 'CORRIDOR', 465.000, 210.000, NULL, 'COR_1F_08', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (55, 1, 3, 'COR_1F_09', '1F绕行拐点09', 'CORRIDOR', 405.000, 240.000, NULL, 'COR_1F_09', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (56, 1, 3, 'COR_1F_10', '1F绕行拐点10', 'CORRIDOR', 750.000, 270.000, NULL, 'COR_1F_10', 1, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (57, 1, 3, 'COR_1F_11', '1F东北走廊', 'CORRIDOR', 790.000, 180.000, NULL, NULL, 0, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (58, 1, 3, 'COR_1F_12', '1F东侧走廊中段', 'CORRIDOR', 750.000, 250.000, NULL, NULL, 0, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (59, 1, 3, 'COR_1F_13', '1F东侧走廊西段', 'CORRIDOR', 665.000, 235.000, NULL, NULL, 0, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (60, 1, 3, 'COR_1F_14', '1F中部北侧走廊', 'CORRIDOR', 600.000, 220.000, NULL, NULL, 0, '2026-09-21 15:45:47');
INSERT INTO `nav_node` VALUES (62, 1, 4, 'SHOP_CP-2F-SVG-001', 'DESCENTE 无', 'SHOP', 602.295, 139.977, NULL, 'NODE_2F_SHOP_01', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (63, 1, 4, 'SHOP_CP-2F-SVG-002', 'HIMO 海马体摄影', 'SHOP', 563.334, 173.924, NULL, 'NODE_2F_SHOP_02', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (64, 1, 4, 'SHOP_CP-2F-SVG-003', 'Black Rose 黑玫瑰', 'SHOP', 544.407, 183.463, NULL, 'NODE_2F_SHOP_03', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (65, 1, 4, 'SHOP_CP-2F-SVG-004', 'SISYPHE 西西弗', 'SHOP', 461.981, 227.028, NULL, 'NODE_2F_SHOP_04', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (66, 1, 4, 'SHOP_CP-2F-SVG-005', 'Jeffn’friends', 'SHOP', 609.499, 212.121, NULL, 'NODE_2F_SHOP_05', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (67, 1, 4, 'SHOP_CP-2F-SVG-006', 'adidas', 'SHOP', 557.837, 264.316, NULL, 'NODE_2F_SHOP_06', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (68, 1, 4, 'SHOP_CP-2F-SVG-007', 'Insta360 影石', 'SHOP', 729.906, 263.095, NULL, 'NODE_2F_SHOP_07', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (69, 1, 4, 'SHOP_CP-2F-SVG-008', 'FEI YUE SHANG HAI', 'SHOP', 541.690, 272.449, NULL, 'NODE_2F_SHOP_08', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (70, 1, 4, 'SHOP_CP-2F-SVG-009', 'UP COFFEE 矢量咖啡', 'SHOP', 437.023, 272.545, NULL, 'NODE_2F_SHOP_09', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (71, 1, 4, 'SHOP_CP-2F-SVG-010', 'TOM\'S WORLD 汤姆熊', 'SHOP', 414.912, 321.100, NULL, 'NODE_2F_SHOP_10', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (72, 1, 4, 'SHOP_CP-2F-SVG-011', 'LEGO 乐高', 'SHOP', 578.785, 305.523, NULL, 'NODE_2F_SHOP_11', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (73, 1, 4, 'SHOP_CP-2F-SVG-012', 'Black Sky 黑空ก', 'SHOP', 516.543, 318.508, NULL, 'NODE_2F_SHOP_12', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (74, 1, 4, 'SHOP_CP-2F-SVG-013', 'Hinos 小蓝象', 'SHOP', 261.202, 343.385, NULL, 'NODE_2F_SHOP_13', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (75, 1, 4, 'SHOP_CP-2F-SVG-014', 'Uncle Hippo 河马叔叔', 'SHOP', 278.089, 348.456, NULL, 'NODE_2F_SHOP_14', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (76, 1, 4, 'SHOP_CP-2F-SVG-015', 'Xueersi 学而思', 'SHOP', 528.441, 343.645, NULL, 'NODE_2F_SHOP_15', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (77, 1, 4, 'SHOP_CP-2F-SVG-016', 'iFlytek 科大讯飞', 'SHOP', 489.010, 338.977, NULL, 'NODE_2F_SHOP_16', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (78, 1, 4, 'SHOP_CP-2F-SVG-017', 'Chaoqimiao 超奇妙', 'SHOP', 325.655, 374.505, NULL, 'NODE_2F_SHOP_17', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (79, 1, 4, 'SHOP_CP-2F-SVG-018', 'TeenieWeenie', 'SHOP', 454.997, 339.043, NULL, 'NODE_2F_SHOP_18', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (80, 1, 4, 'SHOP_CP-2F-SVG-019', 'imoo 小天才', 'SHOP', 453.871, 336.346, NULL, 'NODE_2F_SHOP_19', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (81, 1, 4, 'SHOP_CP-2F-SVG-020', 'Xiaoyuan 小猿学练机', 'SHOP', 546.485, 362.905, NULL, 'NODE_2F_SHOP_20', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (82, 1, 4, 'SHOP_CP-2F-SVG-021', 'Boys and Girls 男生女生', 'SHOP', 517.363, 362.338, NULL, 'NODE_2F_SHOP_21', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (83, 1, 4, 'SHOP_CP-2F-SVG-022', 'Theta Star 西塔星球, Xita Planet 西塔星球', 'SHOP', 311.693, 392.089, NULL, 'NODE_2F_SHOP_22', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (84, 1, 4, 'SHOP_CP-2F-SVG-023', 'HONOR 荣耀', 'SHOP', 577.858, 372.091, NULL, 'NODE_2F_SHOP_23', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (85, 1, 4, 'SHOP_CP-2F-SVG-024', 'TOM\'S WORLD 汤姆', 'SHOP', 419.490, 388.371, NULL, 'NODE_2F_SHOP_24', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (86, 1, 4, 'SHOP_CP-2F-SVG-025', 'Tangxiaoman', 'SHOP', 236.361, 426.030, NULL, 'NODE_2F_SHOP_25', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (87, 1, 4, 'SHOP_CP-2F-SVG-026', 'Alphabet & U-JAR', 'SHOP', 525.247, 393.226, NULL, 'NODE_2F_SHOP_26', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (88, 1, 4, 'SHOP_CP-2F-SVG-027', 'balabala 巴拉巴拉', 'SHOP', 470.961, 427.812, NULL, 'NODE_2F_SHOP_27', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (89, 1, 4, 'SHOP_CP-2F-SVG-028', 'TARANIS 泰兰尼斯', 'SHOP', 331.388, 433.744, NULL, 'NODE_2F_SHOP_28', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (90, 1, 4, 'SHOP_CP-2F-SVG-029', 'SKECHERS KIDS 斯凯奇 KIDS', 'SHOP', 382.254, 436.486, NULL, 'NODE_2F_SHOP_29', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (91, 1, 4, 'SHOP_CP-2F-SVG-030', '3WAREHOUSE 3号仓库', 'SHOP', 295.342, 436.945, NULL, 'NODE_2F_SHOP_30', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (93, 1, 4, 'COR_2F_01', '2F绕行拐点01', 'CORRIDOR', 610.000, 160.000, NULL, 'COR_2F_01', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (94, 1, 4, 'COR_2F_02', '2F绕行拐点02', 'CORRIDOR', 590.000, 170.000, NULL, 'COR_2F_02', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (95, 1, 4, 'COR_2F_03', '2F绕行拐点03', 'CORRIDOR', 510.000, 310.000, NULL, 'COR_2F_03', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (96, 1, 4, 'COR_2F_04', '2F绕行拐点04', 'CORRIDOR', 250.000, 440.000, NULL, 'COR_2F_04', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (97, 1, 4, 'COR_2F_05', '2F绕行拐点05', 'CORRIDOR', 430.000, 410.000, NULL, 'COR_2F_05', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (98, 1, 4, 'COR_2F_06', '2F绕行拐点06', 'CORRIDOR', 400.000, 440.000, NULL, 'COR_2F_06', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (99, 1, 4, 'COR_2F_07', '2F绕行拐点07', 'CORRIDOR', 640.000, 220.000, NULL, 'COR_2F_07', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (100, 1, 4, 'COR_2F_08', '2F绕行拐点08', 'CORRIDOR', 660.000, 200.000, NULL, 'COR_2F_08', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (101, 1, 4, 'COR_2F_09', '2F绕行拐点09', 'CORRIDOR', 720.000, 220.000, NULL, 'COR_2F_09', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (102, 1, 4, 'COR_2F_10', '2F绕行拐点10', 'CORRIDOR', 740.000, 240.000, NULL, 'COR_2F_10', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (103, 1, 4, 'COR_2F_11', '2F绕行拐点11', 'CORRIDOR', 740.000, 250.000, NULL, 'COR_2F_11', 1, '2026-09-22 14:13:56');
INSERT INTO `nav_node` VALUES (108, 1, 3, 'ELEVATOR_01', '电梯 01', 'ELEVATOR', 724.000, 294.000, 'ELEVATOR_01', 'svg-elevator-01', 1, '2026-09-22 14:54:37');
INSERT INTO `nav_node` VALUES (109, 1, 3, 'ELEVATOR_N2', '电梯 N2', 'ELEVATOR', 330.000, 375.000, 'ELEVATOR_N2', 'svg-elevator-n2', 1, '2026-09-22 14:54:37');
INSERT INTO `nav_node` VALUES (110, 1, 3, 'ELEVATOR_P3', '电梯 P3', 'ELEVATOR', 243.000, 343.000, 'ELEVATOR_P3', 'svg-elevator-p3', 1, '2026-09-22 14:54:37');
INSERT INTO `nav_node` VALUES (111, 1, 4, 'ELEVATOR_01', '电梯 01', 'ELEVATOR', 723.000, 294.000, 'ELEVATOR_01', 'svg-elevator-01', 1, '2026-09-22 14:54:37');
INSERT INTO `nav_node` VALUES (112, 1, 4, 'ELEVATOR_N2', '电梯 N2', 'ELEVATOR', 330.000, 375.000, 'ELEVATOR_N2', 'svg-elevator-n2', 1, '2026-09-22 14:54:37');
INSERT INTO `nav_node` VALUES (113, 1, 4, 'ELEVATOR_P3', '电梯 P3', 'ELEVATOR', 237.000, 348.000, 'ELEVATOR_P3', 'svg-elevator-p3', 1, '2026-09-22 14:54:37');

-- ----------------------------
-- Table structure for schema_migration_history
-- ----------------------------
DROP TABLE IF EXISTS `schema_migration_history`;
CREATE TABLE `schema_migration_history`  (
  `migration_code` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `applied_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`migration_code`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '一次性数据库坐标迁移记录' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of schema_migration_history
-- ----------------------------
INSERT INTO `schema_migration_history` VALUES ('20260921_1f_svg_top_left_coordinate', '2026-09-21 16:43:35');

-- ----------------------------
-- Table structure for shop
-- ----------------------------
DROP TABLE IF EXISTS `shop`;
CREATE TABLE `shop`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `mall_id` bigint UNSIGNED NOT NULL,
  `floor_id` bigint UNSIGNED NOT NULL,
  `category_id` bigint UNSIGNED NULL DEFAULT NULL,
  `node_id` bigint UNSIGNED NULL DEFAULT NULL COMMENT '可先录入店铺后标注节点；为空时不支持导航',
  `shop_code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '商场内唯一店铺编号',
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '允许同品牌多门店同名',
  `unit_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '铺位号',
  `opening_hours` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL,
  `status` enum('OPEN','TEMP_CLOSED','CLOSED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'OPEN',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_shop_code`(`mall_id` ASC, `shop_code` ASC) USING BTREE,
  UNIQUE INDEX `uk_shop_mall_id`(`mall_id` ASC, `id` ASC) USING BTREE,
  UNIQUE INDEX `uk_shop_node`(`node_id` ASC) USING BTREE,
  INDEX `idx_shop_search`(`floor_id` ASC, `name` ASC) USING BTREE,
  INDEX `fk_shop_floor`(`mall_id` ASC, `floor_id` ASC) USING BTREE,
  INDEX `fk_shop_node`(`floor_id` ASC, `node_id` ASC) USING BTREE,
  INDEX `fk_shop_category`(`category_id` ASC) USING BTREE,
  CONSTRAINT `fk_shop_category` FOREIGN KEY (`category_id`) REFERENCES `shop_category` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_shop_floor` FOREIGN KEY (`mall_id`, `floor_id`) REFERENCES `mall_floor` (`mall_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_shop_node` FOREIGN KEY (`floor_id`, `node_id`) REFERENCES `nav_node` (`floor_id`, `id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 177 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '店铺；坐标通过node_id读取，避免重复维护' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of shop
-- ----------------------------
INSERT INTO `shop` VALUES (88, 1, 1, NULL, NULL, 'CP-B2-001', '711便利店', 'B2F-25', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (89, 1, 1, NULL, NULL, 'CP-B2-002', '奈雪茶 NAYUKI', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (90, 1, 1, NULL, NULL, 'CP-B2-003', '汉堡王', 'B2-06+07', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (91, 1, 1, NULL, NULL, 'CP-B2-004', '苏小柳', 'B2E-1+2+3', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (92, 1, 1, NULL, NULL, 'CP-B2-005', '金洪兴蟹黄面', 'B2-13', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (93, 1, 1, NULL, NULL, 'CP-B2-006', '胖邱薯薯', 'B2E-12+14', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (94, 1, 2, NULL, NULL, 'CP-B1-001', 'UNIQLO优衣库', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (95, 1, 2, NULL, NULL, 'CP-B1-002', '塞娜烟酒行', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (96, 1, 3, NULL, 1, 'CP-1F-001', '始祖鸟', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (97, 1, 3, NULL, 2, 'CP-1F-002', 'DESCENTE', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (98, 1, 3, NULL, 3, 'CP-1F-003', '丝芙兰(Sephora)', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (99, 1, 3, NULL, 4, 'CP-1F-004', '华为', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (100, 1, 3, NULL, 5, 'CP-1F-005', 'CHOW TAI FOOK 周大福', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (101, 1, 3, NULL, 6, 'CP-1F-006', 'CHJ JEWELLERY 潮宏基', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (102, 1, 3, NULL, 7, 'CP-1F-007', 'Lavazza', 'GF37', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (103, 1, 4, NULL, NULL, 'CP-2F-001', '华为', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (104, 1, 4, NULL, NULL, 'CP-2F-002', '3号仓库', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (105, 1, 5, NULL, NULL, 'CP-3F-001', 'W.Management', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (106, 1, 5, NULL, NULL, 'CP-3F-002', '无印良品', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (107, 1, 5, NULL, NULL, 'CP-3F-003', '名创优品', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (108, 1, 5, NULL, NULL, 'CP-3F-004', '茂昌镜界', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (109, 1, 5, NULL, NULL, 'CP-3F-005', '耳语', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (110, 1, 5, NULL, NULL, 'CP-3F-006', '一撇一捺', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (111, 1, 5, NULL, NULL, 'CP-3F-007', 'BOLON', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (112, 1, 5, NULL, NULL, 'CP-3F-008', 'ECCO', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (113, 1, 5, NULL, NULL, 'CP-3F-009', 'BELLE', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (114, 1, 5, NULL, NULL, 'CP-3F-010', 'STACCATO（思佳图）', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (115, 1, 5, NULL, NULL, 'CP-3F-011', 'JOY&PEACE真美诗', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (116, 1, 6, NULL, NULL, 'CP-4F-001', '耐克', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (117, 1, 6, NULL, NULL, 'CP-4F-002', 'Samsonite', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (118, 1, 7, NULL, NULL, 'CP-5F-001', '高达', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (119, 1, 7, NULL, NULL, 'CP-5F-002', 'Champion', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (120, 1, 7, NULL, NULL, 'CP-5F-003', 'NEW BALANCE', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (121, 1, 7, NULL, NULL, 'CP-5F-004', 'Adidas Originals', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (122, 1, 7, NULL, NULL, 'CP-5F-005', 'Dig Potency', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (123, 1, 7, NULL, NULL, 'CP-5F-006', 'THEGUNDAMBASE', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (124, 1, 7, NULL, NULL, 'CP-5F-007', 'POPMART', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (125, 1, 7, NULL, NULL, 'CP-5F-008', 'ROG', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (126, 1, 7, NULL, NULL, 'CP-5F-009', '广莲申', '5F48L', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (127, 1, 7, NULL, NULL, 'CP-5F-010', '璞徽', '5F24-26', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (128, 1, 8, NULL, NULL, 'CP-7F-001', '港丽餐厅', '7F02A', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (129, 1, 8, NULL, NULL, 'CP-7F-002', '俄式厨房', NULL, NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (130, 1, 8, NULL, NULL, 'CP-7F-003', 'Yes 啫啫', '7F16', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (131, 1, 8, NULL, NULL, 'CP-7F-004', '紫颖', '7F06AB', NULL, 'OPEN', '2026-09-21 10:48:13', '2026-09-21 10:48:13');
INSERT INTO `shop` VALUES (132, 1, 3, NULL, 8, 'CP-1F-SVG-001', 'COLNAGO', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (133, 1, 3, NULL, 9, 'CP-1F-SVG-003', 'Luk Fook Jewellery 六福珠', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (134, 1, 3, NULL, 10, 'CP-1F-SVG-004', 'CHOW TAI SENG 周大生', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (135, 1, 3, NULL, 11, 'CP-1F-SVG-005', 'CHOW TAI SENG', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (136, 1, 3, NULL, 12, 'CP-1F-SVG-006', '瑞幸咖啡 LUCKIN COFFEE', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (137, 1, 3, NULL, 13, 'CP-1F-SVG-007', 'LACOSTE', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (138, 1, 3, NULL, 14, 'CP-1F-SVG-009', 'Chow Sang Sang 周生生', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (139, 1, 3, NULL, 15, 'CP-1F-SVG-011', 'LOKAL By Wagas', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (140, 1, 3, NULL, 16, 'CP-1F-SVG-016', 'KEEP LOOKING', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (141, 1, 3, NULL, 17, 'CP-1F-SVG-017', 'FLOWER PLUS 花加', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (142, 1, 3, NULL, 18, 'CP-1F-SVG-018', 'Green&Safe', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (143, 1, 3, NULL, 19, 'CP-1F-SVG-019', 'Heiseiya 平成屋', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (144, 1, 3, NULL, 20, 'CP-1F-SVG-020', 'ICICLE 之禾', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (145, 1, 3, NULL, 21, 'CP-1F-SVG-021', 'manner', NULL, NULL, 'OPEN', '2026-09-21 10:56:45', '2026-09-21 15:30:25');
INSERT INTO `shop` VALUES (146, 1, 4, NULL, 62, 'CP-2F-SVG-001', 'DESCENTE 无', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (147, 1, 4, NULL, 63, 'CP-2F-SVG-002', 'HIMO 海马体摄影', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (148, 1, 4, NULL, 64, 'CP-2F-SVG-003', 'Black Rose 黑玫瑰', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (149, 1, 4, NULL, 65, 'CP-2F-SVG-004', 'SISYPHE 西西弗', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (150, 1, 4, NULL, 66, 'CP-2F-SVG-005', 'Jeffn’friends', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (151, 1, 4, NULL, 67, 'CP-2F-SVG-006', 'adidas', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (152, 1, 4, NULL, 68, 'CP-2F-SVG-007', 'Insta360 影石', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (153, 1, 4, NULL, 69, 'CP-2F-SVG-008', 'FEI YUE SHANG HAI', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (154, 1, 4, NULL, 70, 'CP-2F-SVG-009', 'UP COFFEE 矢量咖啡', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (155, 1, 4, NULL, 71, 'CP-2F-SVG-010', 'TOM\'S WORLD 汤姆熊', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (156, 1, 4, NULL, 72, 'CP-2F-SVG-011', 'LEGO 乐高', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (157, 1, 4, NULL, 73, 'CP-2F-SVG-012', 'Black Sky 黑空ก', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (158, 1, 4, NULL, 74, 'CP-2F-SVG-013', 'Hinos 小蓝象', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (159, 1, 4, NULL, 75, 'CP-2F-SVG-014', 'Uncle Hippo 河马叔叔', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (160, 1, 4, NULL, 76, 'CP-2F-SVG-015', 'Xueersi 学而思', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (161, 1, 4, NULL, 77, 'CP-2F-SVG-016', 'iFlytek 科大讯飞', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (162, 1, 4, NULL, 78, 'CP-2F-SVG-017', 'Chaoqimiao 超奇妙', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (163, 1, 4, NULL, 79, 'CP-2F-SVG-018', 'TeenieWeenie', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (164, 1, 4, NULL, 80, 'CP-2F-SVG-019', 'imoo 小天才', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (165, 1, 4, NULL, 81, 'CP-2F-SVG-020', 'Xiaoyuan 小猿学练机', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (166, 1, 4, NULL, 82, 'CP-2F-SVG-021', 'Boys and Girls 男生女生', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (167, 1, 4, NULL, 83, 'CP-2F-SVG-022', 'Theta Star 西塔星球, Xita Planet 西塔星球', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (168, 1, 4, NULL, 84, 'CP-2F-SVG-023', 'HONOR 荣耀', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (169, 1, 4, NULL, 85, 'CP-2F-SVG-024', 'TOM\'S WORLD 汤姆', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (170, 1, 4, NULL, 86, 'CP-2F-SVG-025', 'Tangxiaoman', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (171, 1, 4, NULL, 87, 'CP-2F-SVG-026', 'Alphabet & U-JAR', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (172, 1, 4, NULL, 88, 'CP-2F-SVG-027', 'balabala 巴拉巴拉', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (173, 1, 4, NULL, 89, 'CP-2F-SVG-028', 'TARANIS 泰兰尼斯', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (174, 1, 4, NULL, 90, 'CP-2F-SVG-029', 'SKECHERS KIDS 斯凯奇 KIDS', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');
INSERT INTO `shop` VALUES (175, 1, 4, NULL, 91, 'CP-2F-SVG-030', '3WAREHOUSE 3号仓库', NULL, NULL, 'OPEN', '2026-09-22 14:13:56', '2026-09-22 14:13:56');

-- ----------------------------
-- Table structure for shop_category
-- ----------------------------
DROP TABLE IF EXISTS `shop_category`;
CREATE TABLE `shop_category`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '餐饮、服饰、生活服务等',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_category_name`(`name` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '店铺分类' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of shop_category
-- ----------------------------

-- ----------------------------
-- Table structure for shop_traffic_stat
-- ----------------------------
DROP TABLE IF EXISTS `shop_traffic_stat`;
CREATE TABLE `shop_traffic_stat`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `shop_id` bigint UNSIGNED NOT NULL,
  `bucket_start` datetime NOT NULL COMMENT '北京时间，固定5分钟窗口起点，左闭右开',
  `data_source` enum('SIMULATED','REAL') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'SIMULATED',
  `entered_count` int UNSIGNED NOT NULL COMMENT '本窗口进店人次，不是去重人数',
  `exited_count` int UNSIGNED NOT NULL COMMENT '本窗口出店人次',
  `occupancy_count` int UNSIGNED NULL DEFAULT NULL COMMENT '窗口结束时店内人数快照；未知填NULL',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_shop_traffic_bucket`(`shop_id` ASC, `data_source` ASC, `bucket_start` ASC) USING BTREE,
  CONSTRAINT `fk_shop_traffic_shop` FOREIGN KEY (`shop_id`) REFERENCES `shop` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `ck_shop_bucket` CHECK ((second(`bucket_start`) = 0) and ((minute(`bucket_start`) % 5) = 0))
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '店铺客流，每店铺每数据来源每5分钟一条' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of shop_traffic_stat
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;

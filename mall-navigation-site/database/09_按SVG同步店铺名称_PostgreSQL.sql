-- PostgreSQL 版：上海正大广场楼层SVG店铺名称同步
-- 在 pgAdmin 中连接到已经导入 mall_navigation 表结构与数据的目标数据库后执行。
-- 更新已知 shop_code 对应的 name；补充缺失楼层和店铺。B2/B3 跳过。
-- 不修改 node_id、坐标、铺位、营业时间、导航节点或边；不删除旧记录。
BEGIN;

CREATE TEMP TABLE tmp_mall_context (mall_id BIGINT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO tmp_mall_context (mall_id)
SELECT id FROM public.mall
WHERE name IN ('上海正大广场', '正大广场')
ORDER BY id LIMIT 1;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tmp_mall_context) THEN
    RAISE EXCEPTION '找不到上海正大广场记录，请确认已连接正确数据库并检查 public.mall.name';
  END IF;
END $$;

-- 仅补入缺失楼层，不填SVG或坐标信息。
INSERT INTO public.mall_floor (mall_id, floor_code, sort_order)
SELECT c.mall_id, x.floor_code, x.sort_order
FROM tmp_mall_context c
CROSS JOIN (VALUES
  ('B1', -1), ('1F', 1), ('2F', 2), ('3F', 3), ('4F', 4),
  ('5F', 5), ('6F', 6), ('7F', 7), ('8F', 8), ('9F', 9), ('10F', 10)
) AS x(floor_code, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.mall_floor f
  WHERE f.mall_id = c.mall_id AND f.floor_code = x.floor_code
);

CREATE TEMP TABLE tmp_svg_shop_sync_20261021 (
  floor_code VARCHAR(20) NOT NULL,
  shop_code VARCHAR(64) NOT NULL,
  shop_name VARCHAR(100) NOT NULL,
  PRIMARY KEY (floor_code, shop_code)
) ON COMMIT DROP;
INSERT INTO tmp_svg_shop_sync_20261021 (floor_code, shop_code, shop_name) VALUES
  ('B1', 'CP-B1-SVG-001', 'Nova vision 宝岛眼镜'),
  ('B1', 'CP-B1-001', 'UNIQLO 优衣库'),
  ('B1', 'CP-B1-SVG-003', 'natural beauty 自然美'),
  ('B1', 'CP-B1-SVG-004', 'Hua Fu Li Ren'),
  ('B1', 'CP-B1-002', 'Seine Tobacco 塞娜烟酒行'),
  ('B1', 'CP-B1-SVG-006', 'Ctrip 携程'),
  ('B1', 'CP-B1-SVG-007', '3AM HAIR SALON'),
  ('B1', 'CP-B1-SVG-008', 'FORNET'),
  ('B1', 'CP-B1-SVG-009', 'FamilyMart 全家'),
  ('B1', 'CP-B1-SVG-010', 'Ching Studio'),
  ('B1', 'CP-B1-SVG-011', '新洁'),
  ('1F', 'CP-1F-002', 'DESCENTE'),
  ('1F', 'CP-1F-003', '丝芙兰(Sephora)'),
  ('1F', 'CP-1F-SVG-006', '瑞幸咖啡 LUCKIN COFFEE'),
  ('1F', 'CP-1F-001', '始祖鸟'),
  ('1F', 'CP-1F-SVG-001', 'COLNAGO'),
  ('1F', 'CP-1F-SVG-020', 'ICICLE 之禾'),
  ('1F', 'CP-1F-SVG-017', 'FLOWER PLUS 花加'),
  ('1F', 'CP-1F-SVG-011', 'LOKAL By Wagas'),
  ('1F', 'CP-1F-SVG-016', 'KEEP LOOKING'),
  ('1F', 'CP-1F-SVG-007', 'LACOSTE'),
  ('1F', 'CP-1F-SVG-018', 'Green&Safe'),
  ('1F', 'CP-1F-004', '华为'),
  ('1F', 'CP-1F-007', 'Lavazza'),
  ('1F', 'CP-1F-SVG-003', 'Luk Fook Jewellery 六福珠宝'),
  ('1F', 'CP-1F-SVG-004', 'CHOW TAI SENG 周大生'),
  ('1F', 'CP-1F-SVG-005', 'CHOW TAI SENG'),
  ('1F', 'CP-1F-006', 'CHJ JEWELLERY 潮宏基'),
  ('1F', 'CP-1F-005', 'CHOW TAI FOOK 周大福'),
  ('1F', 'CP-1F-SVG-009', 'Chow Sang Sang 周生生'),
  ('1F', 'CP-1F-SVG-021', 'manner'),
  ('1F', 'CP-1F-SVG-019', 'Heiseiya 平成屋'),
  ('2F', 'CP-2F-SVG-001', 'DESCENTE 无'),
  ('2F', 'CP-2F-SVG-002', 'HIMO 海马体摄影'),
  ('2F', 'CP-2F-SVG-003', 'Black Rose 黑玫瑰'),
  ('2F', 'CP-2F-SVG-004', 'SISYPHE 西西弗'),
  ('2F', 'CP-2F-SVG-005', 'Jeffn’friends'),
  ('2F', 'CP-2F-SVG-006', 'adidas'),
  ('2F', 'CP-2F-SVG-007', 'Insta360 影石'),
  ('2F', 'CP-2F-SVG-008', 'FEI YUE SHANG HAI'),
  ('2F', 'CP-2F-SVG-009', 'UP COFFEE 矢量咖啡'),
  ('2F', 'CP-2F-SVG-010', 'TOM''S WORLD 汤姆熊'),
  ('2F', 'CP-2F-SVG-011', 'LEGO 乐高'),
  ('2F', 'CP-2F-SVG-012', 'Black Sky 黑空ก'),
  ('2F', 'CP-2F-SVG-013', 'Hinos 小蓝象'),
  ('2F', 'CP-2F-SVG-014', 'Uncle Hippo 河马叔叔'),
  ('2F', 'CP-2F-SVG-015', 'Xueersi 学而思'),
  ('2F', 'CP-2F-SVG-016', 'iFlytek 科大讯飞'),
  ('2F', 'CP-2F-SVG-017', 'Chaoqimiao 超奇妙'),
  ('2F', 'CP-2F-SVG-018', 'TeenieWeenie'),
  ('2F', 'CP-2F-SVG-019', 'imoo 小天才'),
  ('2F', 'CP-2F-SVG-020', 'Xiaoyuan 小猿学练机'),
  ('2F', 'CP-2F-SVG-021', 'Boys and Girls 男生女生'),
  ('2F', 'CP-2F-SVG-022', 'Theta Star 西塔星球, Xita Planet 西塔星球'),
  ('2F', 'CP-2F-SVG-023', 'HONOR 荣耀'),
  ('2F', 'CP-2F-SVG-024', 'TOM''S WORLD 汤姆'),
  ('2F', 'CP-2F-SVG-025', 'Tangxiaoman'),
  ('2F', 'CP-2F-SVG-026', 'Alphabet & U-JAR'),
  ('2F', 'CP-2F-SVG-027', 'balabala 巴拉巴拉'),
  ('2F', 'CP-2F-SVG-028', 'TARANIS 泰兰尼斯'),
  ('2F', 'CP-2F-SVG-029', 'SKECHERS KIDS 斯凯奇 KIDS'),
  ('2F', 'CP-2F-002', '3WAREHOUSE 3号仓库'),
  ('3F', 'CP-3F-SVG-001', 'Holiland 好利来'),
  ('3F', 'CP-3F-SVG-002', 'QingZhi 青稚护手霜'),
  ('3F', 'CP-3F-008', 'ECCO 爱步'),
  ('3F', 'CP-3F-001', 'w.management'),
  ('3F', 'CP-3F-SVG-005', 'Sanwushiguang 叁伍拾光'),
  ('3F', 'CP-3F-SVG-006', 'Luneurs'),
  ('3F', 'CP-3F-SVG-007', '野人先生 YEAH GELATO'),
  ('3F', 'CP-3F-007', 'BOLON 暴龙眼镜'),
  ('3F', 'CP-3F-002', 'MUJI'),
  ('3F', 'CP-3F-SVG-010', 'BonJour 本就茶饮'),
  ('3F', 'CP-3F-SVG-011', 'Crocs 卡洛驰'),
  ('3F', 'CP-3F-SVG-012', 'Chaletey 茶乐媞'),
  ('3F', 'CP-3F-SVG-013', 'Sidagar 世大家'),
  ('3F', 'CP-3F-SVG-014', 'Victorinox/ZIPPO/Parker 维氏/ZIPPO/派克系列'),
  ('3F', 'CP-3F-SVG-015', 'woodbuddy 我的巴迪'),
  ('3F', 'CP-3F-SVG-016', 'CHAGEE 霸王茶姬'),
  ('3F', 'CP-3F-SVG-017', 'URBAN REVIVO A'),
  ('3F', 'CP-3F-SVG-018', 'xiwen 禧闻'),
  ('3F', 'CP-3F-005', 'ERYU 耳语'),
  ('3F', 'CP-3F-SVG-020', 'Starbucks 星巴克'),
  ('3F', 'CP-3F-003', 'MINISO 名创优品'),
  ('3F', 'CP-3F-006', 'YPYN 一撇一捺'),
  ('3F', 'CP-3F-SVG-023', 'B.U.T. ESSE、Faleeda'),
  ('3F', 'CP-3F-004', 'Mao Chang 茂昌镜界'),
  ('3F', 'CP-3F-SVG-025', 'AIMER 爱慕'),
  ('3F', 'CP-3F-SVG-026', 'Soufflé Jewellery 潮宏基Souffle'),
  ('3F', 'CP-3F-SVG-027', 'wacoal 华歌尔'),
  ('3F', 'CP-3F-010', 'STACCATO 思加图'),
  ('3F', 'CP-3F-SVG-029', 'CLMX'),
  ('3F', 'CP-3F-SVG-030', 'Ilsee 伊夏'),
  ('3F', 'CP-3F-SVG-031', 'URBAN REVIVO B'),
  ('3F', 'CP-3F-SVG-032', 'Wild Aroma Garden 野氛花园'),
  ('3F', 'CP-3F-SVG-033', 'CHAKO LAB'),
  ('3F', 'CP-3F-SVG-034', 'WOW BEAUTY'),
  ('3F', 'CP-3F-SVG-035', 'Triumph 黛安芬'),
  ('3F', 'CP-3F-SVG-036', 'VIEAING 薇迎'),
  ('3F', 'CP-3F-SVG-037', 'TaoXiahushoushuang 桃夏'),
  ('3F', 'CP-3F-011', 'JOY&PEACE 真美诗'),
  ('3F', 'CP-3F-SVG-039', 'ORIGIN 悦木之源'),
  ('3F', 'CP-3F-009', 'BELLE 百丽'),
  ('3F', 'CP-3F-SVG-041', 'TSMLXLT'),
  ('3F', 'CP-3F-SVG-042', 'OVV'),
  ('3F', 'CP-3F-SVG-043', 'VICTORIA CASHMERE 维多利亚羊绒'),
  ('3F', 'CP-3F-SVG-044', 'LE JARDIN deJoel Robuchon 乔尔·卢布松美食'),
  ('3F', 'CP-3F-SVG-045', 'AIFANDIKE'),
  ('3F', 'CP-3F-SVG-046', 'WANGFUJING'),
  ('3F', 'CP-3F-SVG-047', 'Southside Story 城南往事'),
  ('4F', 'CP-4F-001', 'NIKE'),
  ('4F', 'CP-4F-SVG-002', 'MOTION 漠浔健身'),
  ('4F', 'CP-4F-SVG-003', 'Li-NING'),
  ('4F', 'CP-4F-SVG-004', '手机虾 Mobile phone shrimp'),
  ('4F', 'CP-4F-SVG-005', 'JSquared'),
  ('4F', 'CP-4F-SVG-006', 'Bei Mi Si Health Centre'),
  ('4F', 'CP-4F-SVG-007', 'FILA'),
  ('4F', 'CP-4F-SVG-008', 'YUANYUAN 圆苑'),
  ('4F', 'CP-4F-SVG-009', 'Saucony 索康尼'),
  ('4F', 'CP-4F-SVG-010', 'mitchell&ness'),
  ('4F', 'CP-4F-SVG-011', 'Court'),
  ('4F', 'CP-4F-SVG-012', 'CASIO 卡西欧'),
  ('4F', 'CP-4F-SVG-013', 'Wuhuan 五环'),
  ('4F', 'CP-4F-002', 'Samsonite 新秀丽'),
  ('4F', 'CP-4F-SVG-015', 'PAULO PEDRO 保罗彼得'),
  ('4F', 'CP-4F-SVG-016', 'XINGSHUFU CUISINES'),
  ('5F', 'CP-5F-SVG-001', 'QingChuan 青川'),
  ('5F', 'CP-5F-SVG-002', 'McDonald''s 麦当劳'),
  ('5F', 'CP-5F-SVG-003', 'LEGO 乐高'),
  ('5F', 'CP-5F-SVG-004', 'Saizeriya 萨莉亚意式餐厅'),
  ('5F', 'CP-5F-SVG-005', 'Kinsho Sushi 金匠寿司'),
  ('5F', 'CP-5F-007', 'POPMART'),
  ('5F', 'CP-5F-006', 'THEGUNDAMBASE'),
  ('5F', 'CP-5F-SVG-008', '1555273'),
  ('5F', 'CP-5F-SVG-009', 'ST yoga   善媞·莲心'),
  ('5F', 'CP-5F-SVG-010', 'JOYMARK'),
  ('5F', 'CP-5F-SVG-011', 'Taoxingdu 淘星嘟弹珠堂'),
  ('5F', 'CP-5F-SVG-012', 'HEYTEA 喜茶'),
  ('5F', 'CP-5F-SVG-013', '99·mini 美甲美睫'),
  ('5F', 'CP-5F-009', 'Grand Liz 广莲申'),
  ('5F', 'CP-5F-SVG-015', 'DARK VOID 黑空'),
  ('5F', 'CP-5F-SVG-016', 'Sweet7 7分甜'),
  ('5F', 'CP-5F-SVG-017', 'BUTTER&FISH'),
  ('5F', 'CP-5F-SVG-018', '平成屋 HEISEIYA'),
  ('5F', 'CP-5F-SVG-019', 'SPACELAB 失重餐厅'),
  ('5F', 'CP-5F-SVG-020', 'The Upside Down World 颠倒星空'),
  ('5F', 'CP-5F-008', 'ROG'),
  ('5F', 'CP-5F-SVG-022', 'Loti 乐贴'),
  ('5F', 'CP-5F-SVG-023', 'MS SUE'),
  ('5F', 'CP-5F-002', 'Champion 冠军'),
  ('5F', 'CP-5F-003', 'NewBalance'),
  ('5F', 'CP-5F-SVG-026', 'Svenson 史云逊'),
  ('5F', 'CP-5F-SVG-027', 'YAO SHE'),
  ('5F', 'CP-5F-004', 'Adidas Originals'),
  ('5F', 'CP-5F-010', 'The Puhui 璞徽'),
  ('5F', 'CP-5F-SVG-030', 'MLB'),
  ('5F', 'CP-5F-SVG-031', 'AMERICAN TOURISTER 美旅'),
  ('5F', 'CP-5F-SVG-032', 'QiIN: AWAKENING'),
  ('5F', 'CP-5F-SVG-033', 'XISHAO NIUNIU 禧烧妞妞'),
  ('5F', 'CP-5F-SVG-034', 'Pu Jiang Xiao Yue 浦江晓月'),
  ('6F', 'CP-6F-SVG-001', 'XUN XIANG JI 巡湘记'),
  ('6F', 'CP-6F-SVG-002', 'Kwei Mun Lung 桂满陇'),
  ('6F', 'CP-6F-SVG-003', 'Golden Waterside 唏嘛香牛肉拉面'),
  ('6F', 'CP-6F-SVG-004', 'Maluji 麻六记'),
  ('6F', 'CP-6F-SVG-005', 'Spicy Tanggan 辣堂赣'),
  ('6F', 'CP-6F-SVG-006', 'Lao Cheng Du 老成都吃货铺'),
  ('6F', 'CP-6F-SVG-007', 'FOOD AND MOOD 欧味多'),
  ('6F', 'CP-6F-SVG-008', 'JUN JUN Bear 俊俊熊扭蛋机'),
  ('6F', 'CP-6F-SVG-009', 'Tian Shan Guli Xinjiang Pilaf'),
  ('6F', 'CP-6F-SVG-010', '蔡澜点心 CHUA LAM''S DIM SUM'),
  ('6F', 'CP-6F-SVG-011', 'Ningji 柠季手打柠檬茶'),
  ('6F', 'CP-6F-SVG-012', 'Childhood 小时候童年小卖部'),
  ('6F', 'CP-6F-SVG-013', 'Zhuge grilled fish	诸葛烤鱼'),
  ('6F', 'CP-6F-SVG-014', 'Yuan wei xian 缘味先'),
  ('6F', 'CP-6F-SVG-015', 'Linwanting 林晚亭'),
  ('6F', 'CP-6F-SVG-016', 'HK FEI GUO RICE NOODLE	 肥锅'),
  ('6F', 'CP-6F-SVG-017', 'LEONA GELATO'),
  ('6F', 'CP-6F-SVG-018', 'Huainan Beef Soup 淮南牛肉汤'),
  ('6F', 'CP-6F-SVG-019', 'ZHOU Rice Noodles 周大舅'),
  ('6F', 'CP-6F-SVG-020', 'Xiang yan fu 享燕福'),
  ('6F', 'CP-6F-SVG-021', 'Yuchuan Spicy dry hot pot	魔都渝川香'),
  ('6F', 'CP-6F-SVG-022', 'Wuhan Noodles 武汉热干面'),
  ('6F', 'CP-6F-SVG-023', 'Winter star 冬の星'),
  ('6F', 'CP-6F-SVG-024', 'QILIXIANG 柒鲤鄉'),
  ('6F', 'CP-6F-SVG-025', 'CHEF FEI 费大厨'),
  ('6F', 'CP-6F-SVG-026', '苏韵百年面馆'),
  ('6F', 'CP-6F-SVG-027', 'The Alley 鹿角巷'),
  ('6F', 'CP-6F-SVG-028', 'Super Thai 超级泰'),
  ('6F', 'CP-6F-SVG-029', '蟹无恙'),
  ('6F', 'CP-6F-SVG-030', 'DUK CANTONESE CUSINE 点都德'),
  ('6F', 'CP-6F-SVG-031', '甘肃天水 麻辣粉'),
  ('6F', 'CP-6F-SVG-032', '砂鍋美容銀粵式砂鍋'),
  ('6F', 'CP-6F-SVG-033', 'Micun Bibimbap 米村拌饭'),
  ('6F', 'CP-6F-SVG-034', '台北牛肉麵'),
  ('6F', 'CP-6F-SVG-035', 'Lann Massage 兰泰式古法按摩'),
  ('6F', 'CP-6F-SVG-036', 'TSUI WAH 翠华'),
  ('6F', 'CP-6F-SVG-037', '海尚趣'),
  ('6F', 'CP-6F-SVG-038', '楚东君'),
  ('6F', 'CP-6F-SVG-039', 'YAOJI BIG IRON POT 姚稷大铁锅'),
  ('6F', 'CP-6F-SVG-040', 'SPLENDID TOWER 锦之楼'),
  ('6F', 'CP-6F-SVG-041', 'EBILI 宜百利'),
  ('6F', 'CP-6F-SVG-042', 'Ninten Asobi 任天游'),
  ('6F', 'CP-6F-SVG-043', 'Square Battle 方格大战'),
  ('6F', 'CP-6F-SVG-044', 'Toysrus 玩具反斗城'),
  ('6F', 'CP-6F-SVG-045', 'Yangfang Shabu-shabu 阳坊 涮肉'),
  ('6F', 'CP-6F-SVG-046', 'Zhang Sheng Ji 张生记'),
  ('7F', 'CP-7F-SVG-001', 'Yer-shari 耶里夏丽'),
  ('7F', 'CP-7F-001', 'CHARME 港丽餐厅'),
  ('7F', 'CP-7F-SVG-003', '佬鲜纪 Lao''s Fresh Chicken Hotpot'),
  ('7F', 'CP-7F-SVG-004', 'Brother''s Late Night Diner 哥哥深夜食堂'),
  ('7F', 'CP-7F-SVG-005', 'YUSONG Teppanyaki 雨松 3'),
  ('7F', 'CP-7F-SVG-006', 'NAN LI SHAN FANG 南里山房'),
  ('7F', 'CP-7F-SVG-007', 'YUSONG Teppanyaki 雨松 2'),
  ('7F', 'CP-7F-SVG-008', 'YUSONG Teppanyaki 雨松 1'),
  ('7F', 'CP-7F-SVG-009', 'QiParty'),
  ('7F', 'CP-7F-SVG-010', 'Mei KTV 魅KTV 3'),
  ('7F', 'CP-7F-SVG-011', 'Dig Potency'),
  ('7F', 'CP-7F-SVG-012', 'Mei KTV 魅KTV 2'),
  ('7F', 'CP-7F-SVG-013', 'Mei KTV 魅KTV 1'),
  ('7F', 'CP-7F-SVG-014', 'Mei KTV 魅KTV 4'),
  ('7F', 'CP-7F-SVG-015', 'SHANTI YOGA PILATES'),
  ('7F', 'CP-7F-SVG-016', 'xcape 异时刻'),
  ('7F', 'CP-7F-SVG-017', 'PEARL DELUXE'),
  ('7F', 'CP-7F-004', 'LA ZEPHIRE 紫颖'),
  ('7F', 'CP-7F-SVG-019', 'Mei KTV 魅KTV 5'),
  ('7F', 'CP-7F-SVG-020', 'Yu Ku 鱼酷'),
  ('7F', 'CP-7F-SVG-021', 'Qiangtou Yunnan Bistro 呛头家'),
  ('7F', 'CP-7F-SVG-022', 'LIN JIA 临家'),
  ('7F', 'CP-7F-SVG-023', 'SoYoung 新氧'),
  ('7F', 'CP-7F-SVG-024', 'EA Beauty 欧亚美创'),
  ('7F', 'CP-7F-SVG-025', 'B.U.T. ESSE'),
  ('7F', 'CP-7F-SVG-026', 'SPASHINING 诗泥'),
  ('7F', 'CP-7F-SVG-027', 'LISSOM T 轻悅炼普拉提'),
  ('7F', 'CP-7F-SVG-028', 'New Beauty'),
  ('7F', 'CP-7F-SVG-029', 'Aiweiting SPA 艾维庭SPA'),
  ('7F', 'CP-7F-SVG-030', 'GUAN HAO Seafood 观蚝'),
  ('7F', 'CP-7F-SVG-031', 'BEI HAI YAN by YUGE 北海宴.渔哥'),
  ('8F', 'CP-8F-SVG-001', 'Careful Massage 璞 沄间'),
  ('8F', 'CP-8F-SVG-002', 'Fu Tian Tian Fresh Beef Brisket Hotpot 富天添牛腩煲火锅'),
  ('8F', 'CP-8F-SVG-003', 'Hao Chi Hot Pot 濠七糟粕醋火锅'),
  ('8F', 'CP-8F-SVG-004', 'Three Hundred Li Yunnan Hot Pot 三百里'),
  ('8F', 'CP-8F-SVG-005', 'Dim.Sun'),
  ('8F', 'CP-8F-SVG-006', 'BIZHEN	毕真'),
  ('8F', 'CP-8F-SVG-007', 'LeMan 乐漫演艺空间'),
  ('8F', 'CP-8F-SVG-008', 'Xiding sea urchin dumplings 喜顶上品'),
  ('8F', 'CP-8F-SVG-009', 'Yue Xian Tai Zhou caisine 樾鲜食馆'),
  ('8F', 'CP-8F-SVG-010', 'AHNYOOPOP 安又胖'),
  ('8F', 'CP-8F-SVG-011', 'TEPPEI MAN-MAN 哲平鳗满'),
  ('8F', 'CP-8F-SVG-012', 'Tai Er Sauerkraut Fish 太二'),
  ('8F', 'CP-8F-SVG-013', 'Zuo ting you yuan Hotpot 左庭右院'),
  ('8F', 'CP-8F-SVG-014', 'Xiao cai yuan 小菜园'),
  ('8F', 'CP-8F-SVG-015', 'XIANG LA LA 湘辣辣'),
  ('8F', 'CP-8F-SVG-016', 'BUERJUN LESHANCAI 不二君'),
  ('8F', 'CP-8F-SVG-017', 'SHANGHAI XIAO NAN GUO 小南国'),
  ('9F', 'CP-9F-SVG-001', 'eat n work 1'),
  ('9F', 'CP-9F-SVG-002', 'eat n work 2'),
  ('10F', 'CP-10F-SVG-001', 'eat n work 3');
-- 仅更新有明确 shop_code 映射的店名。
UPDATE public.shop AS s
SET name = t.shop_name
FROM tmp_svg_shop_sync_20261021 AS t, public.mall_floor AS f, tmp_mall_context AS c
WHERE s.mall_id = c.mall_id
  AND s.floor_id = f.id
  AND f.mall_id = c.mall_id
  AND f.floor_code = t.floor_code
  AND s.shop_code = t.shop_code;

-- 添加清单中尚不存在的店铺；不覆盖已有记录的其他信息。
INSERT INTO public.shop (mall_id, floor_id, shop_code, name)
SELECT c.mall_id, f.id, t.shop_code, t.shop_name
FROM tmp_svg_shop_sync_20261021 AS t
JOIN tmp_mall_context AS c ON TRUE
JOIN public.mall_floor AS f ON f.mall_id = c.mall_id AND f.floor_code = t.floor_code
WHERE NOT EXISTS (
  SELECT 1 FROM public.shop s WHERE s.mall_id = c.mall_id AND s.shop_code = t.shop_code
)
AND NOT EXISTS (
  SELECT 1 FROM public.shop s
  WHERE s.mall_id = c.mall_id AND s.floor_id = f.id AND s.name = t.shop_name
);

-- 核对清单匹配数与未找到的店名，不展示位置字段。
SELECT t.floor_code,
       COUNT(DISTINCT t.shop_code) AS svg_shop_count,
       COUNT(DISTINCT s.id) AS matched_shop_count
FROM tmp_svg_shop_sync_20261021 AS t
JOIN tmp_mall_context AS c ON TRUE
JOIN public.mall_floor AS f ON f.mall_id = c.mall_id AND f.floor_code = t.floor_code
LEFT JOIN public.shop AS s ON s.mall_id = c.mall_id AND s.floor_id = f.id
  AND (s.shop_code = t.shop_code OR s.name = t.shop_name)
GROUP BY t.floor_code, f.sort_order
ORDER BY f.sort_order;

SELECT t.floor_code, t.shop_name AS missing_name, t.shop_code
FROM tmp_svg_shop_sync_20261021 AS t
JOIN tmp_mall_context AS c ON TRUE
JOIN public.mall_floor AS f ON f.mall_id = c.mall_id AND f.floor_code = t.floor_code
LEFT JOIN public.shop AS s ON s.mall_id = c.mall_id AND s.floor_id = f.id
  AND (s.shop_code = t.shop_code OR s.name = t.shop_name)
WHERE s.id IS NULL
ORDER BY f.sort_order, t.shop_code;

COMMIT;

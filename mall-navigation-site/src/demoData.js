// Local demo values shaped like the mall_navigation schema. Replace this module
// with API responses when the backend is ready; no simulated data is persisted.
export const floors = [
  { code: "B1", sort: 1, occupancy: 548, sales: 21800, traffic: 1890, orders: 364 },
  { code: "1F", sort: 2, occupancy: 1284, sales: 86420, traffic: 4862, orders: 1096 },
  { code: "2F", sort: 3, occupancy: 974, sales: 62280, traffic: 3894, orders: 902 },
  { code: "3F", sort: 4, occupancy: 830, sales: 48830, traffic: 3320, orders: 748 },
  { code: "4F", sort: 5, occupancy: 762, sales: 58300, traffic: 2917, orders: 641 },
  { code: "5F", sort: 6, occupancy: 1190, sales: 73920, traffic: 4120, orders: 975 },
  { code: "6F", sort: 7, occupancy: 960, sales: 61500, traffic: 3600, orders: 812 },
  { code: "7F", sort: 8, occupancy: 610, sales: 37150, traffic: 2160, orders: 451 },
  { code: "8F", sort: 9, occupancy: 540, sales: 31200, traffic: 1930, orders: 402 },
  { code: "9F", sort: 10, occupancy: 470, sales: 26800, traffic: 1710, orders: 356 },
  { code: "10F", sort: 11, occupancy: 390, sales: 22100, traffic: 1460, orders: 305 },
];

const store = (id, floor, name, category, unit, sales, traffic, orders) => ({ id, floor, name, category, unit, sales, traffic, orders });
export const shops = [
  store(97, "1F", "DESCENTE 迪桑特", "运动户外", "1F · 中庭东侧", 8640, 486, 128),
  store(96, "1F", "始祖鸟 ARC’TERYX", "运动户外", "1F · 中庭", 12820, 612, 142),
  store(98, "1F", "丝芙兰 SEPHORA", "美妆个护", "1F · 近东门", 15360, 788, 209),
  store(99, "1F", "华为 HUAWEI", "数码生活", "1F · 主通道", 20680, 435, 106),
  store(100, "1F", "周大福 CHOW TAI FOOK", "珠宝配饰", "1F · 中庭西侧", 31800, 522, 94),
  store(101, "1F", "潮宏基", "珠宝配饰", "1F · 近南门", 11760, 361, 76),
  store(102, "1F", "Lavazza", "餐饮咖啡", "1F · GF37", 6240, 501, 183),
  store(62, "2F", "DESCENTE", "运动户外", "2F · 中庭北侧", 11640, 524, 154),
  store(63, "2F", "Black Rose 黑玫瑰", "餐饮咖啡", "2F · 西侧", 9210, 406, 142),
  store(64, "2F", "SISYPHE 西西弗", "生活方式", "2F · 中庭", 7320, 588, 203),
  store(65, "2F", "adidas", "运动户外", "2F · 东侧", 15420, 642, 176),
  store(66, "2F", "UP COFFEE 矢量咖啡", "餐饮咖啡", "2F · 近北门", 5060, 479, 171),
  store(67, "2F", "TOM’S WORLD 汤姆熊", "休闲娱乐", "2F · 南侧", 13200, 714, 248),
  store(68, "2F", "LEGO 乐高", "生活方式", "2F · 中庭东侧", 18420, 682, 194),
  store(69, "2F", "TeenieWeenie", "服饰鞋包", "2F · 西侧", 10780, 375, 105),
  store(70, "3F", "无印良品 MUJI", "生活方式", "3F · 中庭", 23800, 896, 312),
  store(71, "3F", "名创优品", "生活方式", "3F · 主通道", 14200, 762, 284),
  store(72, "4F", "Nike", "运动户外", "4F · 中庭", 21400, 742, 218),
  store(73, "5F", "POP MART", "生活方式", "5F · 主通道", 27800, 916, 347),
  store(74, "7F", "港丽餐厅", "餐饮咖啡", "7F · 7F02A", 19200, 638, 182),
  // 以下店铺按楼层地图补齐，保证每个楼层在经营分析中都有店铺数据（演示值）
  store(75, "B1", "UNIQLO 优衣库", "服饰鞋包", "B1 · 近地铁", 19800, 820, 260),
  store(76, "B1", "3AM HAIR SALON", "美妆个护", "B1 · 东侧", 6200, 240, 70),
  store(77, "6F", "Kwei Mun Lung 桂满陇", "餐饮咖啡", "6F · 中庭", 18600, 690, 210),
  store(78, "6F", "Maluji 麻六记", "餐饮咖啡", "6F · 北侧", 14200, 580, 180),
  store(79, "8F", "Dim.Sun", "餐饮咖啡", "8F · 中庭", 9600, 410, 120),
  store(80, "8F", "LeMan 乐漫演艺空间", "休闲娱乐", "8F · 南侧", 8200, 360, 90),
  store(81, "9F", "eat n work 1", "生活方式", "9F · 东侧", 5400, 260, 70),
  store(82, "10F", "eat n work 3", "生活方式", "10F · 西侧", 4800, 240, 60),
];

export const categories = ["全部", "餐饮咖啡", "服饰鞋包", "运动户外", "美妆个护", "数码生活", "珠宝配饰", "生活方式", "休闲娱乐"];
export const analytics = {
  trend: [
    { label: "10:00", sales: 1800, traffic: 630 }, { label: "11:00", sales: 2700, traffic: 940 },
    { label: "12:00", sales: 3700, traffic: 1200 }, { label: "13:00", sales: 3200, traffic: 1140 },
    { label: "14:00", sales: 4900, traffic: 1540 }, { label: "15:00", sales: 4250, traffic: 1380 },
    { label: "16:00", sales: 4620, traffic: 1490 }, { label: "17:00", sales: 3760, traffic: 1310 },
    { label: "18:00", sales: 3140, traffic: 1080 }, { label: "19:00", sales: 2810, traffic: 990 },
    { label: "20:00", sales: 1750, traffic: 760 }, { label: "21:00", sales: 1290, traffic: 520 },
  ],
};

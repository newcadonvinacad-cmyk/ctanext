const test = require('node:test');
const assert = require('node:assert/strict');

// Import helper logic transpiled or directly implemented
function calculateOtAmount(k1Mins, k2Mins, k3Mins, k4Mins) {
  const amountK1 = Math.round((k1Mins / 60) * 75000);
  const amountK2 = Math.round((k2Mins / 60) * 50000);
  const amountK3 = Math.round((k3Mins / 60) * 75000);
  const amountK4 = Math.round((k4Mins / 60) * 100000);
  const totalAmount = amountK1 + amountK2 + amountK3 + amountK4;
  const totalHours = Math.round(((k1Mins + k2Mins + k3Mins + k4Mins) / 60) * 100) / 100;
  return { amountK1, amountK2, amountK3, amountK4, totalAmount, totalHours };
}

function splitOtProportionally(targetTotalMinutes, origK1, origK2, origK3, origK4) {
  const origSum = origK1 + origK2 + origK3 + origK4;
  if (origSum <= 0 || targetTotalMinutes <= 0) {
    return { k1: 0, k2: 0, k3: 0, k4: 0 };
  }
  const ratio = Math.min(1, targetTotalMinutes / origSum);
  const k1 = Math.round(origK1 * ratio);
  const k2 = Math.round(origK2 * ratio);
  const k3 = Math.round(origK3 * ratio);
  const k4 = targetTotalMinutes - (k1 + k2 + k3);
  return { k1, k2, k3, k4: Math.max(0, k4) };
}

function calculateProjectCostAllocation(totalDirectCosts, totalGeneralPoolCosts, projectKmMap) {
  let totalKmRun = 0;
  for (const k in projectKmMap) {
    totalKmRun += projectKmMap[k].km;
  }
  if (totalKmRun === 0) totalKmRun = 1;

  const costPerKm = Math.round((totalDirectCosts + totalGeneralPoolCosts) / totalKmRun);
  const targets = Object.keys(projectKmMap);
  const allocations = [];
  let allocatedSum = 0;

  targets.forEach((tgtId, idx) => {
    const item = projectKmMap[tgtId];
    const weight = item.km / totalKmRun;
    const directAmt = item.directCost || 0;

    let allocatedGeneral = 0;
    if (idx === targets.length - 1) {
      allocatedGeneral = totalGeneralPoolCosts - allocatedSum;
    } else {
      allocatedGeneral = Math.round(totalGeneralPoolCosts * weight);
      allocatedSum += allocatedGeneral;
    }

    allocations.push({
      targetId: tgtId,
      name: item.name,
      km: item.km,
      directCost: directAmt,
      allocatedGeneral,
      total: directAmt + allocatedGeneral,
    });
  });

  return { totalKmRun, costPerKm, allocations };
}

test('NT41: Mẫu Hino 05/10/2026 tính từ phút gốc đạt đúng 205.833 đ', () => {
  // 98 phút K1 (04-08h) @ 75.000 đ/h = 122.500 đ
  // 100 phút K2 (17-22h) @ 50.000 đ/h = 83.333 đ
  // Tổng = 205.833 đ
  const res = calculateOtAmount(98, 100, 0, 0);
  assert.equal(res.amountK1, 122500);
  assert.equal(res.amountK2, 83333);
  assert.equal(res.totalAmount, 205833);
  assert.equal(res.totalHours, 3.3);
});

test('NT16: Chặng đêm 21:30 - 01:30 đạt 4.0 giờ và 325.000 đ', () => {
  // 21:30 - 22:00: 30p K2 @ 50k = 25.000 đ
  // 22:00 - 24:00: 120p K3 @ 75k = 150.000 đ
  // 00:00 - 01:30: 90p K4 @ 100k = 150.000 đ
  // Tổng 4h = 325.000 đ
  const res = calculateOtAmount(0, 30, 120, 90);
  assert.equal(res.amountK2, 25000);
  assert.equal(res.amountK3, 150000);
  assert.equal(res.amountK4, 150000);
  assert.equal(res.totalAmount, 325000);
  assert.equal(res.totalHours, 4.0);
});

test('NT19: Duyệt một phần theo tỷ lệ phân bổ đúng tỷ trọng các khung', () => {
  // Gốc: 0, 30p, 120p, 90p (Tổng 240p)
  // Duyệt một nửa: 120p
  const split = splitOtProportionally(120, 0, 30, 120, 90);
  assert.equal(split.k1, 0);
  assert.equal(split.k2, 15);
  assert.equal(split.k3, 60);
  assert.equal(split.k4, 45);
  assert.equal(split.k1 + split.k2 + split.k3 + split.k4, 120);

  const res = calculateOtAmount(split.k1, split.k2, split.k3, split.k4);
  assert.equal(res.totalAmount, 162500); // 325.000 / 2 = 162.500 đ
});

test('NT22: Suất tiêu hao nhiên liệu giữa 2 lần đầy bình khép chu kỳ', () => {
  // Lần 1: ODO 142.160 km
  // Lần 2: ODO 142.580 km (Chạy 420 km)
  // Lượng nạp đầy bình lần 2: 42.0 Lít
  const kmBetween = 142580 - 142160;
  const liters = 42.0;
  const rate = Math.round((liters / kmBetween) * 100 * 10) / 10;
  assert.equal(kmBetween, 420);
  assert.equal(rate, 10.0); // 10 L/100km
});

test('NT29: Phân bổ 4.200.000 đ cho Dự án X, Y và Nội bộ khớp 100% từng đồng VND', () => {
  // Chi phí chung = 4.000.000 đ
  // Chi phí trực tiếp Y = 200.000 đ
  // Tổng = 4.200.000 đ
  // Km: Dự án X (600 km), Dự án Y (300 km), Nội bộ (100 km) -> Tổng 1.000 km
  const projectKmMap = {
    proj_X: { name: 'Dự án X', km: 600, directCost: 0 },
    proj_Y: { name: 'Dự án Y', km: 300, directCost: 200000 },
    internal: { name: 'Nội bộ công ty', km: 100, directCost: 0 },
  };

  const res = calculateProjectCostAllocation(200000, 4000000, projectKmMap);
  assert.equal(res.totalKmRun, 1000);
  assert.equal(res.costPerKm, 4200); // 4.200.000 / 1.000 = 4.200 đ/km

  const xAlloc = res.allocations.find((a) => a.targetId === 'proj_X');
  const yAlloc = res.allocations.find((a) => a.targetId === 'proj_Y');
  const intAlloc = res.allocations.find((a) => a.targetId === 'internal');

  assert.equal(xAlloc.allocatedGeneral, 2400000); // 4M * 60%
  assert.equal(xAlloc.total, 2400000);

  assert.equal(yAlloc.allocatedGeneral, 1200000); // 4M * 30%
  assert.equal(yAlloc.directCost, 200000);
  assert.equal(yAlloc.total, 1400000);

  assert.equal(intAlloc.allocatedGeneral, 400000); // 4M * 10%
  assert.equal(intAlloc.total, 400000);

  const sumTotal = xAlloc.total + yAlloc.total + intAlloc.total;
  assert.equal(sumTotal, 4200000); // Tổng khớp đúng 4.200.000 đ
});

test('NT05: Ngưỡng tải trọng xe phân loại chính xác 90% sát tải và >100% quá tải', () => {
  const maxPayload = 1750;
  const isNearLimit = (payload) => payload >= maxPayload * 0.9 && payload <= maxPayload;
  const isOverload = (payload) => payload > maxPayload;

  assert.equal(isNearLimit(1500), false);
  assert.equal(isNearLimit(1575), true); // 90%
  assert.equal(isNearLimit(1750), true); // 100%
  assert.equal(isNearLimit(1751), false);
  assert.equal(isOverload(1751), true); // Quá tải
});

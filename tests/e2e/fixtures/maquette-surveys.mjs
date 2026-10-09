// API fixtures used only by browser tests; the product loads saved project surveys.
export const projectId = 'maquette-test-project';
export const surveys = [
  {id:'survey-horizontal',code:'KS-TEST-01',projectId,title:'Khảo sát bảng ngang',widthMeters:12,heightMeters:2.4,depthMeters:.2,
    address:'Địa chỉ khảo sát',metadata:{dealerName:'THÀNH PHÁT',dealerAddress:'Số 503, Tỉnh lộ 887, Ấp Long Điền, Xã Phước Long, Tỉnh Vĩnh Long',dealerPhone:'091 799 0037 - 0952 114455'}},
  {id:'survey-pillar',code:'KS-TEST-02',projectId,title:'Khảo sát bảng trụ',widthMeters:1,heightMeters:3,depthMeters:.15,
    address:'',metadata:{dealerName:'ĐỨC\nVƯỢNG',dealerAddress:'',dealerPhone:''}},
  {id:'survey-narrow',code:'KS-TEST-03',projectId,title:'Khảo sát bảng hẹp',widthMeters:5.9,heightMeters:.9,depthMeters:.12,
    address:'16/5 Phan Văn Hớn',metadata:{dealerName:'NAM LONG PHÁT',dealerPhone:'0962 464 230'}},
];
export async function installSurveyFixtures(page) {
  await page.route(`**/api/surveys?projectId=${projectId}`,route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({surveys})}));
}

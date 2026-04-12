module.exports = [
  {
    "id": "P20260013",
    "customer": "马女士",
    "address": "朝阳区·阳光100小区 3栋 402",
    "sales": "王销售",
    "designer": "张设计",
    "manager": "李经理",
    "status": "施工中",
    "health": "正常",
    "rating": "B",
    "startDate": "2026-03-26",
    "endDate": "2026-06-25",
    "daysElapsed": 15,
    "progress": 25,
    "currentStage": "水电",
    "nodeName": "水电",
    "currentNode": 2,
    "upcomingTask": "等待水电隐蔽工程验收",
    "records": [
      {
        "id": "r1",
        "date": "2026-03-26 09:30",
        "node": "开工",
        "operator": "李经理",
        "status": "已完成",
        "remark": "顺利开工，成品保护已做好，已进行现场交底。",
        "images": 3
      },
      {
        "id": "r2",
        "date": "2026-04-05 14:20",
        "node": "水电",
        "operator": "李经理",
        "status": "进行中",
        "remark": "水电开槽完毕，管线敷设中，预计3天后申请验收。",
        "images": 2
      }
    ],
    "detailedNodes": [
      {
        "id": "node1",
        "name": "开工阶段",
        "status": "已完成",
        "plannedStart": "2026-03-26",
        "plannedEnd": "2026-04-05",
        "actualStart": "2026-03-26",
        "actualEnd": "2026-04-05",
        "subNodes": [
          {
            "id": "sub1-1",
            "name": "现场交底",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "现场交底 施工已完成，符合工艺标准。",
                "date": "2026-03-26 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub1-2",
            "name": "成品保护",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "成品保护 施工已完成，符合工艺标准。",
                "date": "2026-03-26 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node2",
        "name": "水电阶段",
        "status": "进行中",
        "plannedStart": "2026-04-07",
        "plannedEnd": "2026-04-17",
        "actualStart": "2026-04-07",
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub2-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-04-07 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-2",
            "name": "水电开槽",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "水电开槽 施工已完成，符合工艺标准。",
                "date": "2026-04-07 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-3",
            "name": "管线敷设",
            "status": "进行中",
            "reports": [
              {
                "type": "施工动态",
                "content": "管线敷设 施工进行中，符合工艺标准。",
                "date": "2026-04-07 10:00",
                "reporter": "系统生成",
                "images": []
              }
            ]
          },
          {
            "id": "sub2-4",
            "name": "隐蔽工程验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node3",
        "name": "木工阶段",
        "status": "未开始",
        "plannedStart": "2026-04-19",
        "plannedEnd": "2026-04-29",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub3-1",
            "name": "材料进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub3-2",
            "name": "吊顶龙骨",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub3-3",
            "name": "封板及验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node4",
        "name": "瓦工阶段",
        "status": "未开始",
        "plannedStart": "2026-05-01",
        "plannedEnd": "2026-05-11",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub4-1",
            "name": "材料进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub4-2",
            "name": "防水闭水",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub4-3",
            "name": "贴砖及验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node5",
        "name": "墙面阶段",
        "status": "未开始",
        "plannedStart": "2026-05-13",
        "plannedEnd": "2026-05-23",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub5-1",
            "name": "底层找平",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub5-2",
            "name": "批刮腻子",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub5-3",
            "name": "底漆面漆",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node6",
        "name": "定制阶段",
        "status": "未开始",
        "plannedStart": "2026-05-25",
        "plannedEnd": "2026-06-04",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub6-1",
            "name": "柜体安装",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub6-2",
            "name": "木门安装",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node7",
        "name": "软装阶段",
        "status": "未开始",
        "plannedStart": "2026-06-06",
        "plannedEnd": "2026-06-16",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub7-1",
            "name": "家具进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub7-2",
            "name": "灯具卫浴",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node8",
        "name": "交付阶段",
        "status": "未开始",
        "plannedStart": "2026-06-18",
        "plannedEnd": "2026-06-28",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub8-1",
            "name": "拓荒保洁",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub8-2",
            "name": "竣工验收",
            "status": "未开始",
            "reports": []
          }
        ]
      }
    ]
  },
  {
    "id": "P20260003",
    "customer": "郭女士",
    "address": "海淀区·望京SOHO 2栋 1101",
    "sales": "李销售",
    "designer": "王设计",
    "manager": "王经理",
    "status": "已竣工",
    "health": "预警",
    "rating": "A",
    "startDate": "2025-12-10",
    "endDate": "2026-03-10",
    "daysElapsed": 121,
    "progress": 100,
    "currentStage": "交付",
    "nodeName": "交付",
    "currentNode": 8,
    "upcomingTask": "客户已结清尾款",
    "records": [
      {
        "id": "r3",
        "date": "2025-12-10 10:00",
        "node": "开工",
        "operator": "王经理",
        "status": "已完成",
        "remark": "交底完成，开工大吉。",
        "images": 4
      },
      {
        "id": "r4",
        "date": "2026-03-15 16:30",
        "node": "交付",
        "operator": "王经理",
        "status": "已完成",
        "remark": "竣工验收通过，客户非常满意，已签署竣工单。延期5天原因：主材门板到货延迟。",
        "images": 5
      }
    ],
    "detailedNodes": [
      {
        "id": "node1",
        "name": "开工阶段",
        "status": "已完成",
        "plannedStart": "2025-12-10",
        "plannedEnd": "2025-12-20",
        "actualStart": "2025-12-10",
        "actualEnd": "2025-12-20",
        "subNodes": [
          {
            "id": "sub1-1",
            "name": "现场交底",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "现场交底 施工已完成，符合工艺标准。",
                "date": "2025-12-10 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub1-2",
            "name": "成品保护",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "成品保护 施工已完成，符合工艺标准。",
                "date": "2025-12-10 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node2",
        "name": "水电阶段",
        "status": "已完成",
        "plannedStart": "2025-12-22",
        "plannedEnd": "2026-01-01",
        "actualStart": "2025-12-22",
        "actualEnd": "2026-01-01",
        "subNodes": [
          {
            "id": "sub2-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2025-12-22 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-2",
            "name": "水电开槽",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "水电开槽 施工已完成，符合工艺标准。",
                "date": "2025-12-22 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-3",
            "name": "管线敷设",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "管线敷设 施工已完成，符合工艺标准。",
                "date": "2025-12-22 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-4",
            "name": "隐蔽工程验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "隐蔽工程验收 施工已完成，符合工艺标准。",
                "date": "2025-12-22 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node3",
        "name": "木工阶段",
        "status": "已完成",
        "plannedStart": "2026-01-03",
        "plannedEnd": "2026-01-13",
        "actualStart": "2026-01-03",
        "actualEnd": "2026-01-13",
        "subNodes": [
          {
            "id": "sub3-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-01-03 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub3-2",
            "name": "吊顶龙骨",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "吊顶龙骨 施工已完成，符合工艺标准。",
                "date": "2026-01-03 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub3-3",
            "name": "封板及验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "封板及验收 施工已完成，符合工艺标准。",
                "date": "2026-01-03 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node4",
        "name": "瓦工阶段",
        "status": "已完成",
        "plannedStart": "2026-01-15",
        "plannedEnd": "2026-01-25",
        "actualStart": "2026-01-15",
        "actualEnd": "2026-01-25",
        "subNodes": [
          {
            "id": "sub4-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-01-15 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub4-2",
            "name": "防水闭水",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "防水闭水 施工已完成，符合工艺标准。",
                "date": "2026-01-15 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub4-3",
            "name": "贴砖及验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "贴砖及验收 施工已完成，符合工艺标准。",
                "date": "2026-01-15 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node5",
        "name": "墙面阶段",
        "status": "已完成",
        "plannedStart": "2026-01-27",
        "plannedEnd": "2026-02-06",
        "actualStart": "2026-01-27",
        "actualEnd": "2026-02-06",
        "subNodes": [
          {
            "id": "sub5-1",
            "name": "底层找平",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "底层找平 施工已完成，符合工艺标准。",
                "date": "2026-01-27 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub5-2",
            "name": "批刮腻子",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "批刮腻子 施工已完成，符合工艺标准。",
                "date": "2026-01-27 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub5-3",
            "name": "底漆面漆",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "底漆面漆 施工已完成，符合工艺标准。",
                "date": "2026-01-27 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node6",
        "name": "定制阶段",
        "status": "已完成",
        "plannedStart": "2026-02-08",
        "plannedEnd": "2026-02-18",
        "actualStart": "2026-02-08",
        "actualEnd": "2026-02-18",
        "subNodes": [
          {
            "id": "sub6-1",
            "name": "柜体安装",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "柜体安装 施工已完成，符合工艺标准。",
                "date": "2026-02-08 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub6-2",
            "name": "木门安装",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "木门安装 施工已完成，符合工艺标准。",
                "date": "2026-02-08 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node7",
        "name": "软装阶段",
        "status": "已完成",
        "plannedStart": "2026-02-20",
        "plannedEnd": "2026-03-02",
        "actualStart": "2026-02-20",
        "actualEnd": "2026-03-02",
        "subNodes": [
          {
            "id": "sub7-1",
            "name": "家具进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "家具进场 施工已完成，符合工艺标准。",
                "date": "2026-02-20 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub7-2",
            "name": "灯具卫浴",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "灯具卫浴 施工已完成，符合工艺标准。",
                "date": "2026-02-20 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node8",
        "name": "交付阶段",
        "status": "已完成",
        "plannedStart": "2026-03-04",
        "plannedEnd": "2026-03-14",
        "actualStart": "2026-03-04",
        "actualEnd": "2026-03-14",
        "subNodes": [
          {
            "id": "sub8-1",
            "name": "拓荒保洁",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "拓荒保洁 施工已完成，符合工艺标准。",
                "date": "2026-03-04 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub8-2",
            "name": "竣工验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "竣工验收 施工已完成，符合工艺标准。",
                "date": "2026-03-04 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "P20260020",
    "customer": "罗女士",
    "address": "通州区·天通苑南 5栋 202",
    "sales": "张销售",
    "designer": "赵设计",
    "manager": "张工",
    "status": "未开工",
    "health": "正常",
    "rating": "C",
    "startDate": "2026-04-20",
    "endDate": "2026-07-19",
    "daysElapsed": 0,
    "progress": 0,
    "currentStage": "开工",
    "nodeName": "开工",
    "currentNode": 1,
    "upcomingTask": "准备进场保护材料",
    "records": [],
    "detailedNodes": [
      {
        "id": "node1",
        "name": "开工阶段",
        "status": "未开始",
        "plannedStart": "2026-04-20",
        "plannedEnd": "2026-04-30",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub1-1",
            "name": "现场交底",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub1-2",
            "name": "成品保护",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node2",
        "name": "水电阶段",
        "status": "未开始",
        "plannedStart": "2026-05-02",
        "plannedEnd": "2026-05-12",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub2-1",
            "name": "材料进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub2-2",
            "name": "水电开槽",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub2-3",
            "name": "管线敷设",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub2-4",
            "name": "隐蔽工程验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node3",
        "name": "木工阶段",
        "status": "未开始",
        "plannedStart": "2026-05-14",
        "plannedEnd": "2026-05-24",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub3-1",
            "name": "材料进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub3-2",
            "name": "吊顶龙骨",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub3-3",
            "name": "封板及验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node4",
        "name": "瓦工阶段",
        "status": "未开始",
        "plannedStart": "2026-05-26",
        "plannedEnd": "2026-06-05",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub4-1",
            "name": "材料进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub4-2",
            "name": "防水闭水",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub4-3",
            "name": "贴砖及验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node5",
        "name": "墙面阶段",
        "status": "未开始",
        "plannedStart": "2026-06-07",
        "plannedEnd": "2026-06-17",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub5-1",
            "name": "底层找平",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub5-2",
            "name": "批刮腻子",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub5-3",
            "name": "底漆面漆",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node6",
        "name": "定制阶段",
        "status": "未开始",
        "plannedStart": "2026-06-19",
        "plannedEnd": "2026-06-29",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub6-1",
            "name": "柜体安装",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub6-2",
            "name": "木门安装",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node7",
        "name": "软装阶段",
        "status": "未开始",
        "plannedStart": "2026-07-01",
        "plannedEnd": "2026-07-11",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub7-1",
            "name": "家具进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub7-2",
            "name": "灯具卫浴",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node8",
        "name": "交付阶段",
        "status": "未开始",
        "plannedStart": "2026-07-13",
        "plannedEnd": "2026-07-23",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub8-1",
            "name": "拓荒保洁",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub8-2",
            "name": "竣工验收",
            "status": "未开始",
            "reports": []
          }
        ]
      }
    ]
  },
  {
    "id": "P20260018",
    "customer": "马先生",
    "address": "丰台区·丽泽桥 1栋 801",
    "sales": "王销售",
    "designer": "张设计",
    "manager": "李经理",
    "status": "施工中",
    "health": "严重延期",
    "rating": "C",
    "startDate": "2025-10-18",
    "endDate": "2026-01-17",
    "daysElapsed": 174,
    "progress": 62,
    "currentStage": "墙面",
    "nodeName": "墙面",
    "currentNode": 5,
    "upcomingTask": "等待面漆施工",
    "records": [
      {
        "id": "r5",
        "date": "2025-10-18 09:00",
        "node": "开工",
        "operator": "李经理",
        "status": "已完成",
        "remark": "正常开工",
        "images": 2
      },
      {
        "id": "r6",
        "date": "2025-11-20 10:00",
        "node": "木工",
        "operator": "李经理",
        "status": "已完成",
        "remark": "吊顶完成验收，因客户要求增加造型，工期顺延。",
        "images": 4
      },
      {
        "id": "r7",
        "date": "2026-02-28 15:00",
        "node": "墙面",
        "operator": "李经理",
        "status": "进行中",
        "remark": "客户春节停工，节后复工晚，腻子已打磨完成。",
        "images": 2
      }
    ],
    "detailedNodes": [
      {
        "id": "node1",
        "name": "开工阶段",
        "status": "已完成",
        "plannedStart": "2025-10-18",
        "plannedEnd": "2025-10-28",
        "actualStart": "2025-10-18",
        "actualEnd": "2025-10-28",
        "subNodes": [
          {
            "id": "sub1-1",
            "name": "现场交底",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "现场交底 施工已完成，符合工艺标准。",
                "date": "2025-10-18 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub1-2",
            "name": "成品保护",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "成品保护 施工已完成，符合工艺标准。",
                "date": "2025-10-18 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node2",
        "name": "水电阶段",
        "status": "已完成",
        "plannedStart": "2025-10-30",
        "plannedEnd": "2025-11-09",
        "actualStart": "2025-10-30",
        "actualEnd": "2025-11-09",
        "subNodes": [
          {
            "id": "sub2-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2025-10-30 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-2",
            "name": "水电开槽",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "水电开槽 施工已完成，符合工艺标准。",
                "date": "2025-10-30 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-3",
            "name": "管线敷设",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "管线敷设 施工已完成，符合工艺标准。",
                "date": "2025-10-30 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-4",
            "name": "隐蔽工程验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "隐蔽工程验收 施工已完成，符合工艺标准。",
                "date": "2025-10-30 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node3",
        "name": "木工阶段",
        "status": "已完成",
        "plannedStart": "2025-11-11",
        "plannedEnd": "2025-11-21",
        "actualStart": "2025-11-11",
        "actualEnd": "2025-11-21",
        "subNodes": [
          {
            "id": "sub3-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2025-11-11 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub3-2",
            "name": "吊顶龙骨",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "吊顶龙骨 施工已完成，符合工艺标准。",
                "date": "2025-11-11 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub3-3",
            "name": "封板及验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "封板及验收 施工已完成，符合工艺标准。",
                "date": "2025-11-11 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node4",
        "name": "瓦工阶段",
        "status": "已完成",
        "plannedStart": "2025-11-23",
        "plannedEnd": "2025-12-03",
        "actualStart": "2025-11-23",
        "actualEnd": "2025-12-03",
        "subNodes": [
          {
            "id": "sub4-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2025-11-23 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub4-2",
            "name": "防水闭水",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "防水闭水 施工已完成，符合工艺标准。",
                "date": "2025-11-23 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub4-3",
            "name": "贴砖及验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "贴砖及验收 施工已完成，符合工艺标准。",
                "date": "2025-11-23 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node5",
        "name": "墙面阶段",
        "status": "进行中",
        "plannedStart": "2025-12-05",
        "plannedEnd": "2025-12-15",
        "actualStart": "2025-12-05",
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub5-1",
            "name": "底层找平",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "底层找平 施工已完成，符合工艺标准。",
                "date": "2025-12-05 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub5-2",
            "name": "批刮腻子",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "批刮腻子 施工已完成，符合工艺标准。",
                "date": "2025-12-05 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub5-3",
            "name": "底漆面漆",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node6",
        "name": "定制阶段",
        "status": "未开始",
        "plannedStart": "2025-12-17",
        "plannedEnd": "2025-12-27",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub6-1",
            "name": "柜体安装",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub6-2",
            "name": "木门安装",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node7",
        "name": "软装阶段",
        "status": "未开始",
        "plannedStart": "2025-12-29",
        "plannedEnd": "2026-01-08",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub7-1",
            "name": "家具进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub7-2",
            "name": "灯具卫浴",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node8",
        "name": "交付阶段",
        "status": "未开始",
        "plannedStart": "2026-01-10",
        "plannedEnd": "2026-01-20",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub8-1",
            "name": "拓荒保洁",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub8-2",
            "name": "竣工验收",
            "status": "未开始",
            "reports": []
          }
        ]
      }
    ]
  },
  {
    "id": "P20260007",
    "customer": "高女士",
    "manager": "刘工",
    "status": "施工中",
    "health": "预警",
    "rating": "A",
    "startDate": "2026-02-15",
    "endDate": "2026-05-15",
    "daysElapsed": 54,
    "progress": 50,
    "currentStage": "瓦工",
    "nodeName": "瓦工",
    "currentNode": 4,
    "upcomingTask": "地砖铺贴及闭水试验",
    "records": [
      {
        "id": "r8",
        "date": "2026-02-15 11:00",
        "node": "开工",
        "operator": "刘工",
        "status": "已完成",
        "remark": "交底正常。",
        "images": 2
      },
      {
        "id": "r9",
        "date": "2026-03-25 14:00",
        "node": "瓦工",
        "operator": "刘工",
        "status": "进行中",
        "remark": "墙砖铺贴完成，卫生间防水正在做。主材瓷砖发货慢了2天。",
        "images": 3
      }
    ],
    "detailedNodes": [
      {
        "id": "node1",
        "name": "开工阶段",
        "status": "已完成",
        "plannedStart": "2026-02-15",
        "plannedEnd": "2026-02-25",
        "actualStart": "2026-02-15",
        "actualEnd": "2026-02-25",
        "subNodes": [
          {
            "id": "sub1-1",
            "name": "现场交底",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "现场交底 施工已完成，符合工艺标准。",
                "date": "2026-02-15 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub1-2",
            "name": "成品保护",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "成品保护 施工已完成，符合工艺标准。",
                "date": "2026-02-15 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node2",
        "name": "水电阶段",
        "status": "已完成",
        "plannedStart": "2026-02-27",
        "plannedEnd": "2026-03-09",
        "actualStart": "2026-02-27",
        "actualEnd": "2026-03-09",
        "subNodes": [
          {
            "id": "sub2-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-02-27 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-2",
            "name": "水电开槽",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "水电开槽 施工已完成，符合工艺标准。",
                "date": "2026-02-27 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-3",
            "name": "管线敷设",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "管线敷设 施工已完成，符合工艺标准。",
                "date": "2026-02-27 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-4",
            "name": "隐蔽工程验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "隐蔽工程验收 施工已完成，符合工艺标准。",
                "date": "2026-02-27 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node3",
        "name": "木工阶段",
        "status": "已完成",
        "plannedStart": "2026-03-11",
        "plannedEnd": "2026-03-21",
        "actualStart": "2026-03-11",
        "actualEnd": "2026-03-21",
        "subNodes": [
          {
            "id": "sub3-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-03-11 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub3-2",
            "name": "吊顶龙骨",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "吊顶龙骨 施工已完成，符合工艺标准。",
                "date": "2026-03-11 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub3-3",
            "name": "封板及验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "封板及验收 施工已完成，符合工艺标准。",
                "date": "2026-03-11 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node4",
        "name": "瓦工阶段",
        "status": "进行中",
        "plannedStart": "2026-03-23",
        "plannedEnd": "2026-04-02",
        "actualStart": "2026-03-23",
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub4-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-03-23 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub4-2",
            "name": "防水闭水",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "防水闭水 施工已完成，符合工艺标准。",
                "date": "2026-03-23 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub4-3",
            "name": "贴砖及验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node5",
        "name": "墙面阶段",
        "status": "未开始",
        "plannedStart": "2026-04-04",
        "plannedEnd": "2026-04-14",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub5-1",
            "name": "底层找平",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub5-2",
            "name": "批刮腻子",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub5-3",
            "name": "底漆面漆",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node6",
        "name": "定制阶段",
        "status": "未开始",
        "plannedStart": "2026-04-16",
        "plannedEnd": "2026-04-26",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub6-1",
            "name": "柜体安装",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub6-2",
            "name": "木门安装",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node7",
        "name": "软装阶段",
        "status": "未开始",
        "plannedStart": "2026-04-28",
        "plannedEnd": "2026-05-08",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub7-1",
            "name": "家具进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub7-2",
            "name": "灯具卫浴",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node8",
        "name": "交付阶段",
        "status": "未开始",
        "plannedStart": "2026-05-10",
        "plannedEnd": "2026-05-20",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub8-1",
            "name": "拓荒保洁",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub8-2",
            "name": "竣工验收",
            "status": "未开始",
            "reports": []
          }
        ]
      }
    ]
  },
  {
    "id": "P20260002",
    "customer": "周先生",
    "manager": "张工",
    "status": "施工中",
    "health": "正常",
    "rating": "A",
    "startDate": "2026-01-05",
    "endDate": "2026-04-05",
    "daysElapsed": 95,
    "progress": 88,
    "currentStage": "定制",
    "nodeName": "定制",
    "currentNode": 6,
    "upcomingTask": "全屋定制柜安装",
    "records": [
      {
        "id": "r10",
        "date": "2026-04-08 09:30",
        "node": "定制",
        "operator": "张工",
        "status": "进行中",
        "remark": "板材进场，开始组装柜体。",
        "images": 4
      }
    ],
    "detailedNodes": [
      {
        "id": "node1",
        "name": "开工阶段",
        "status": "已完成",
        "plannedStart": "2026-01-05",
        "plannedEnd": "2026-01-15",
        "actualStart": "2026-01-05",
        "actualEnd": "2026-01-15",
        "subNodes": [
          {
            "id": "sub1-1",
            "name": "现场交底",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "现场交底 施工已完成，符合工艺标准。",
                "date": "2026-01-05 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub1-2",
            "name": "成品保护",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "成品保护 施工已完成，符合工艺标准。",
                "date": "2026-01-05 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node2",
        "name": "水电阶段",
        "status": "已完成",
        "plannedStart": "2026-01-17",
        "plannedEnd": "2026-01-27",
        "actualStart": "2026-01-17",
        "actualEnd": "2026-01-27",
        "subNodes": [
          {
            "id": "sub2-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-01-17 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-2",
            "name": "水电开槽",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "水电开槽 施工已完成，符合工艺标准。",
                "date": "2026-01-17 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-3",
            "name": "管线敷设",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "管线敷设 施工已完成，符合工艺标准。",
                "date": "2026-01-17 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-4",
            "name": "隐蔽工程验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "隐蔽工程验收 施工已完成，符合工艺标准。",
                "date": "2026-01-17 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node3",
        "name": "木工阶段",
        "status": "已完成",
        "plannedStart": "2026-01-29",
        "plannedEnd": "2026-02-08",
        "actualStart": "2026-01-29",
        "actualEnd": "2026-02-08",
        "subNodes": [
          {
            "id": "sub3-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-01-29 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub3-2",
            "name": "吊顶龙骨",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "吊顶龙骨 施工已完成，符合工艺标准。",
                "date": "2026-01-29 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub3-3",
            "name": "封板及验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "封板及验收 施工已完成，符合工艺标准。",
                "date": "2026-01-29 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node4",
        "name": "瓦工阶段",
        "status": "已完成",
        "plannedStart": "2026-02-10",
        "plannedEnd": "2026-02-20",
        "actualStart": "2026-02-10",
        "actualEnd": "2026-02-20",
        "subNodes": [
          {
            "id": "sub4-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-02-10 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub4-2",
            "name": "防水闭水",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "防水闭水 施工已完成，符合工艺标准。",
                "date": "2026-02-10 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub4-3",
            "name": "贴砖及验收",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "贴砖及验收 施工已完成，符合工艺标准。",
                "date": "2026-02-10 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node5",
        "name": "墙面阶段",
        "status": "已完成",
        "plannedStart": "2026-02-22",
        "plannedEnd": "2026-03-04",
        "actualStart": "2026-02-22",
        "actualEnd": "2026-03-04",
        "subNodes": [
          {
            "id": "sub5-1",
            "name": "底层找平",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "底层找平 施工已完成，符合工艺标准。",
                "date": "2026-02-22 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub5-2",
            "name": "批刮腻子",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "批刮腻子 施工已完成，符合工艺标准。",
                "date": "2026-02-22 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub5-3",
            "name": "底漆面漆",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "底漆面漆 施工已完成，符合工艺标准。",
                "date": "2026-02-22 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node6",
        "name": "定制阶段",
        "status": "进行中",
        "plannedStart": "2026-03-06",
        "plannedEnd": "2026-03-16",
        "actualStart": "2026-03-06",
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub6-1",
            "name": "柜体安装",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "柜体安装 施工已完成，符合工艺标准。",
                "date": "2026-03-06 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub6-2",
            "name": "木门安装",
            "status": "进行中",
            "reports": [
              {
                "type": "施工动态",
                "content": "木门安装 施工进行中，符合工艺标准。",
                "date": "2026-03-06 10:00",
                "reporter": "系统生成",
                "images": []
              }
            ]
          }
        ]
      },
      {
        "id": "node7",
        "name": "软装阶段",
        "status": "未开始",
        "plannedStart": "2026-03-18",
        "plannedEnd": "2026-03-28",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub7-1",
            "name": "家具进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub7-2",
            "name": "灯具卫浴",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node8",
        "name": "交付阶段",
        "status": "未开始",
        "plannedStart": "2026-03-30",
        "plannedEnd": "2026-04-09",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub8-1",
            "name": "拓荒保洁",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub8-2",
            "name": "竣工验收",
            "status": "未开始",
            "reports": []
          }
        ]
      }
    ]
  },
  {
    "id": "P20260027",
    "customer": "孙先生",
    "manager": "李经理",
    "status": "已停工",
    "health": "正常",
    "rating": "B",
    "startDate": "2026-03-01",
    "endDate": "2026-06-01",
    "daysElapsed": 40,
    "progress": 15,
    "currentStage": "水电",
    "nodeName": "水电",
    "currentNode": 2,
    "upcomingTask": "等待客户缴纳二期款",
    "records": [
      {
        "id": "r11",
        "date": "2026-03-01 10:00",
        "node": "开工",
        "operator": "李经理",
        "status": "已完成",
        "remark": "进场保护完成",
        "images": 1
      },
      {
        "id": "r12",
        "date": "2026-03-15 10:00",
        "node": "水电",
        "operator": "李经理",
        "status": "暂停",
        "remark": "水电工程已验收，但客户出差，未及时缴纳二期款项，故办理停工手续。",
        "images": 2
      }
    ],
    "detailedNodes": [
      {
        "id": "node1",
        "name": "开工阶段",
        "status": "已完成",
        "plannedStart": "2026-03-01",
        "plannedEnd": "2026-03-11",
        "actualStart": "2026-03-01",
        "actualEnd": "2026-03-11",
        "subNodes": [
          {
            "id": "sub1-1",
            "name": "现场交底",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "现场交底 施工已完成，符合工艺标准。",
                "date": "2026-03-01 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub1-2",
            "name": "成品保护",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "成品保护 施工已完成，符合工艺标准。",
                "date": "2026-03-01 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "node2",
        "name": "水电阶段",
        "status": "进行中",
        "plannedStart": "2026-03-13",
        "plannedEnd": "2026-03-23",
        "actualStart": "2026-03-13",
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub2-1",
            "name": "材料进场",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "材料进场 施工已完成，符合工艺标准。",
                "date": "2026-03-13 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              },
              {
                "type": "停工记录",
                "content": "因客户出差未交款，暂停施工。",
                "date": "2026-03-15 10:00",
                "reporter": "李经理"
              }
            ]
          },
          {
            "id": "sub2-2",
            "name": "水电开槽",
            "status": "已完成",
            "reports": [
              {
                "type": "验收汇报",
                "content": "水电开槽 施工已完成，符合工艺标准。",
                "date": "2026-03-13 10:00",
                "reporter": "系统生成",
                "images": [
                  "placeholder"
                ]
              }
            ]
          },
          {
            "id": "sub2-3",
            "name": "管线敷设",
            "status": "进行中",
            "reports": [
              {
                "type": "施工动态",
                "content": "管线敷设 施工进行中，符合工艺标准。",
                "date": "2026-03-13 10:00",
                "reporter": "系统生成",
                "images": []
              }
            ]
          },
          {
            "id": "sub2-4",
            "name": "隐蔽工程验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node3",
        "name": "木工阶段",
        "status": "未开始",
        "plannedStart": "2026-03-25",
        "plannedEnd": "2026-04-04",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub3-1",
            "name": "材料进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub3-2",
            "name": "吊顶龙骨",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub3-3",
            "name": "封板及验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node4",
        "name": "瓦工阶段",
        "status": "未开始",
        "plannedStart": "2026-04-06",
        "plannedEnd": "2026-04-16",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub4-1",
            "name": "材料进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub4-2",
            "name": "防水闭水",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub4-3",
            "name": "贴砖及验收",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node5",
        "name": "墙面阶段",
        "status": "未开始",
        "plannedStart": "2026-04-18",
        "plannedEnd": "2026-04-28",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub5-1",
            "name": "底层找平",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub5-2",
            "name": "批刮腻子",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub5-3",
            "name": "底漆面漆",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node6",
        "name": "定制阶段",
        "status": "未开始",
        "plannedStart": "2026-04-30",
        "plannedEnd": "2026-05-10",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub6-1",
            "name": "柜体安装",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub6-2",
            "name": "木门安装",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node7",
        "name": "软装阶段",
        "status": "未开始",
        "plannedStart": "2026-05-12",
        "plannedEnd": "2026-05-22",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub7-1",
            "name": "家具进场",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub7-2",
            "name": "灯具卫浴",
            "status": "未开始",
            "reports": []
          }
        ]
      },
      {
        "id": "node8",
        "name": "交付阶段",
        "status": "未开始",
        "plannedStart": "2026-05-24",
        "plannedEnd": "2026-06-03",
        "actualStart": null,
        "actualEnd": null,
        "subNodes": [
          {
            "id": "sub8-1",
            "name": "拓荒保洁",
            "status": "未开始",
            "reports": []
          },
          {
            "id": "sub8-2",
            "name": "竣工验收",
            "status": "未开始",
            "reports": []
          }
        ]
      }
    ]
  }
];
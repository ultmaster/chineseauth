import re

import pandas as pd
import jieba
from jieba.analyse import textrank


def process_year(x, idx=0):
    if '.' in x:
        y, m = map(int, x.split("."))
    else:
        y, m = int(x), 1 if idx == 0 else 12
    return y * 100 + m


def word_sim(a, b):
    if a == b:
        return 1.0 + len(a) / 20
    elif a.startswith(b) or b.startswith(a):
        return 0.5 + min(len(a), len(b)) / 40
    elif a.endswith(b) or b.endswith(a):
        return 0.3 + min(len(a), len(b)) / 60
    elif a in b or b in a:
        return 0.2 + min(len(a), len(b)) / 100
    return 0.0


def list_sim(la, lb):
    link = 0.0
    for x in la:
        for y in lb:
            link += word_sim(x, y)
    return link


common_word = ["在职研究生学习", "学习", "副组长", "组长", "副所长", "所长", "副院长", "院长", "副主任", "主任",
               "副秘书长", "秘书长", "副司长", "司长",  "副参谋长", "参谋长", "副秘书长", "秘书长", "总参谋长助理",
               "副总参谋长", "大队长", "中队长", "小队长", "副社长", "党组成员兼", '党组成员', '党组', '部长',
               '局长', '省长', '处长', '厅长', '等职', '市长', '厂长', '区长', '董事长', '董事', '秘书', '干部', '科员', '调研员',
               '科长', '总经理', '经理'
               "副研究员", "研究员", "副主席", "主席", "行署专员", "第一书记", "总书记", "常委", "副书记", "书记", "副校长", "校长"]



data = pd.read_csv("data.csv")
new_data = []
ps = []
rs = ""
for idx, row in data.iterrows():
    name = row["姓名"]
    gender = row["性别"]
    nation = row["民族"]
    birth_place = row["出生地"]
    birthday = row["出生日期"]
    graduate = row["毕业院校"]
    profession = row["专业背景"]
    job = row["担任职务"]
    history = row["履历"].split('\n')
    for record in history:
        p = tuple(map(lambda x: x.strip(), record.split(',', 1)))
        # print(p)
        low, high = 0, 201801
        ok = True
        for idx, s in enumerate(p[0].split("—")):
            try:
                y = process_year(s, idx)
                ps.append(y)
                if idx == 0:
                    low = y
                else: high = y
            except:
                if idx == 0:
                    ok = False
                pass
        if not ok:
            continue
        try:
            x = list(filter(lambda x: x, re.split(r"[、，,.。； ]", re.sub(r'（.*?）|\(.*?\)', '', p[1]))))
            for i in range(len(x)):
                for word in common_word:
                    x[i] = re.sub(r"副{0,1}%s" % word, "", x[i])
                if x[i].startswith('任'):
                    x[i] = x[i][1:]
                if x[i].startswith('起任') or x[i].startswith('连任'):
                    x[i] = x[i][2:]
                if len(x[i]) <= 2:
                    x[i] = ''
            x = list(filter(lambda x: x, x))
            print(low, high, x)
            new_data.append((name, low, high, x))
            rs += p[1] + "。"
        except:
            pass

with open("link.csv", "w") as f:
    for year in range(1957, 2018):
        for month in range(1, 13):
            place = year * 100 + month
            have = []
            for name, low, high, x in new_data:
                if low <= place <= high:
                    have.append((name, x))
            for idx, (name1, la) in enumerate(have):
                for name2, lb in have[idx+1:]:
                    ref_value = list_sim(la, lb)
                    if ref_value >= 0.2:
                        print(place, name1.strip(), name2.strip(), round(ref_value, 3), sep=',', file=f)


print(sorted(ps))

# keywords = textrank(rs, topK=30)
# print(keywords)

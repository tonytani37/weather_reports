import requests
import json
jma_url = "https://www.jma.go.jp/bosai/forecast/data/forecast/270000.json"

response = requests.get(jma_url)
jma_json = response.json()

# jma_weather = jma_json[0]["timeSeries"][0]["areas"][0]["weathers"][0].replace(' ','')

# print(jma_json)

forecast_data = jma_json[0]

# 2. timeSeries[0] の天気・風・波の時系列データを取得
time_series_weather = forecast_data.get('timeSeries', [])[0]

# 3. 予報対象の時間定義リストを取得
time_defines = time_series_weather.get('timeDefines', [])

# ===============================================
# 4. データを出力
# ===============================================

print(f"**📢 発表日時: {forecast_data.get('reportDatetime')}**")
print("--------------------------------------------------------------------------------")
print(f"**🗓️ 予報対象期間:**")
for i, time in enumerate(time_defines):
    print(f"  {i+1}日目: {time}")
print("--------------------------------------------------------------------------------\n")


# 5. 地域ごとにループ処理
for area_data in time_series_weather.get('areas', []):
    area_name = area_data['area']['name']
    weathers = area_data.get('weathers', [])
    winds = area_data.get('winds', [])
    waves = area_data.get('waves', [])

    print(f"**📍 地域: {area_name}**")
    
    # 予報対象の時間（timeDefines）の数だけループして情報を整形
    max_len = len(time_defines)
    
    for i in range(max_len):
        time_label = f"[{i+1}日目]"
        weather_info = weathers[i] if i < len(weathers) else "N/A"
        wind_info = winds[i] if i < len(winds) else "N/A"
        wave_info = waves[i] if i < len(waves) else "N/A"
        
        print(f"  {time_label}")
        print(f"    - 天気: {weather_info}")
        print(f"    - 風:   {wind_info}")
        print(f"    - 波:   {wave_info}")
        
    print("--------------------------------------------------------------------------------\n")

# output_filename = 'jma_output.json'

# try:
#     # ファイルを書き込みモード ('w') で開く
#     # 'utf-8' エンコーディングを指定するのが一般的です
#     with open(output_filename, 'w', encoding='utf-8') as f:
#         # json.dump() を使ってデータをファイルに書き込む
#         # 第一引数: 書き込みたいデータ（jma_json）
#         # 第二引数: ファイルオブジェクト（f）
        
#         # 【ポイント】 'indent=4' を指定すると、整形（プリティプリント）されて読みやすくなります
#         json.dump(jma_json, f, ensure_ascii=False, indent=4)
        
#     print(f"✅ JSONデータがファイル '{output_filename}' に出力されました。")

# except Exception as e:
#     print(f"❌ ファイル出力中にエラーが発生しました: {e}")
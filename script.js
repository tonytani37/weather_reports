const outputElement = document.getElementById('output');
const areaSelect = document.getElementById('areaSelect');

// 予報区コードの定義
const FORECAST_AREAS = {
    // "北海道": "010000",
    // "青森県": "020000",
    "関東地方": "130000",
    "愛知県": "230000",
    "大阪府": "270000",
    "福岡県": "400000",
    "沖縄本島地方": "471000"
};

/**
 * 地域選択肢をドロップダウンに追加する関数
 */
function populateAreaSelect() {
    // 最初の選択肢
    areaSelect.innerHTML = '<option value="">--- 地域を選択 ---</option>';
    
    // 定義された地域をオプションとして追加
    for (const [name, code] of Object.entries(FORECAST_AREAS)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        areaSelect.appendChild(option);
    }
}

/**
 * 選択された地域に基づいて予報データを取得し、表示する関数
 */
async function displayWeatherData() {
    const selectedCode = areaSelect.value;

    if (!selectedCode) {
        outputElement.innerHTML = `地域を選択してください。`;
        return;
    }

    const DATA_URL = `https://www.jma.go.jp/bosai/forecast/data/forecast/${selectedCode}.json`;
    outputElement.innerHTML = `📡 ${DATA_URL} からデータを取得中...`;
    
    try {
        // 1. URLからJSONデータを取得
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            outputElement.innerHTML = `<p style="color: red;">エラー: データの取得に失敗しました。HTTPステータス: ${response.status}</p>`;
            return;
        }
        
        // 2. データをJSONオブジェクトに変換
        const jmaJson = await response.json();
        const forecastData = jmaJson[0];
        const timeSeriesWeather = forecastData?.timeSeries?.[0];

        if (!timeSeriesWeather) {
            outputElement.innerHTML = `<p style="color: red;">エラー: timeSeries[0]の予報データが見つかりません。</p>`;
            return;
        }

        const timeDefines = timeSeriesWeather.timeDefines || [];
        const areas = timeSeriesWeather.areas || [];

        // 3. 発表日時と予報対象期間の情報をHTMLに格納
        let htmlContent = `
            <p><strong>📢 発表元:</strong> ${forecastData.publishingOffice || 'N/A'}</p>
            <p><strong>📢 発表日時:</strong> ${forecastData.reportDatetime || 'N/A'}</p>
            <h2>🗓️ 予報対象期間 (${timeDefines.length}回)</h2>
            <ul style="list-style-type: none; padding: 0;">
                ${timeDefines.map((time, index) => 
                    `<li><strong>${index + 1}回目:</strong> ${time}</li>`
                ).join('')}
            </ul>
            <hr>
        `;

        // 4. 地域ごとの予報データ（天気・風・波）を抽出・整形
        htmlContent += `<h2>📍 細分区域別予報詳細 (天気・風・波)</h2>`;
        
        areas.forEach(areaData => {
            const areaName = areaData.area?.name || '地域名不明';
            const weathers = areaData.weathers || [];
            const winds = areaData.winds || [];
            const waves = areaData.waves || [];

            htmlContent += `<div class="area-info"><h3>${areaName}</h3>`;
            
            // timeDefinesの数だけループして情報を整形
            timeDefines.forEach((time, i) => {
                const weatherInfo = weathers[i] || "情報なし";
                const windInfo = winds[i] || "情報なし";
                const waveInfo = waves[i] || "情報なし";

                htmlContent += `
                    <div class="time-info">
                        <h4>[${i + 1}回目]</h4>
                        <ul>
                            <li><strong>天気:</strong> ${weatherInfo}</li>
                            <li><strong>風:</strong> ${windInfo}</li>
                            <li><strong>波:</strong> ${waveInfo}</li>
                        </ul>
                    </div>
                `;
            });

            htmlContent += `</div>`;
        });

        // 5. 結果をHTMLの出力要素に表示
        outputElement.innerHTML = htmlContent;

    } catch (error) {
        outputElement.innerHTML = `<p style="color: red;">データの処理中にエラーが発生しました: ${error.message}</p>`;
        console.error("データ処理エラー:", error);
    }
}

// ページロード時に選択肢を追加し、初期表示を行う
document.addEventListener('DOMContentLoaded', () => {
    populateAreaSelect();
});
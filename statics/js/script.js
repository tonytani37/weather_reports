// ====================================================================
// 定数とDOM要素の取得
// ====================================================================
const outputElement = document.getElementById('output');
const areaSelect = document.getElementById('area-select'); // HTMLに合わせてID名を修正
const forecastTypeControls = document.getElementById('forecastTypeControls');

const JMA_BASE_URL = 'https://www.jma.go.jp/bosai/forecast/data/forecast/';

// 予報区コードの定義
const FORECAST_AREAS = {
    "北海道": "010000",
    "青森県": "020000",
    "関東地方": "130000",
    "愛知県": "230000",
    "大阪府": "270000",
    "福岡県": "400000",
    "沖縄本島地方": "471000"
};

// 予報期間の定義 (index 0:短期, 1:週間)
const FORECAST_TYPES = [
    { id: 'short', name: '短期予報 (今日〜明日)', index: 0 },
    { id: 'weekly', name: '週間予報 (明日以降)', index: 1 }
];

// ====================================================================
// 日付時刻整形ユーティリティ
// ====================================================================

/**
 * ISO 8601形式の日付時刻文字列を 'YYYY/MM/DD HH:MM' 形式に整形する
 * @param {string} isoString - '2025-11-07T11:00:00+09:00' のような文字列
 * @returns {string} 整形された日付文字列
 */
function formatDateTime(isoString) {
    if (!isoString) return '情報なし';

    // Dateオブジェクトを作成
    const date = new Date(isoString);

    // Dateオブジェクトが無効な場合はそのまま返すかエラーメッセージを返す
    if (isNaN(date.getTime())) {
        return isoString; 
    }

    // 各要素を取得し、2桁表示に整形
    const Y = date.getFullYear();
    const M = String(date.getMonth() + 1).padStart(2, '0');
    const D = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    
    return `${Y}/${M}/${D} ${h}:${m}`;
}


// ====================================================================
// 初期設定とイベントリスナーの設定
// ====================================================================

/**
 * コントロール（セレクトボックスとラジオボタン）を初期化する
 */
function populateControls() {
    // 1. 地域選択ドロップダウンのオプションを追加
    areaSelect.innerHTML = '<option value="">--- 地域を選択 ---</option>';
    for (const [name, code] of Object.entries(FORECAST_AREAS)) {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = name;
        areaSelect.appendChild(option);
    }

    // 2. 予報期間ラジオボタンを追加
    let radiosHtml = '';
    FORECAST_TYPES.forEach((type, i) => {
        radiosHtml += `
            <label style="margin-right: 15px;">
                <input
                    type="radio"
                    name="forecastType"
                    value="${type.index}"
                    id="type-${type.id}"
                    ${i === 0 ? 'checked' : ''}
                />
                ${type.name}
            </label>
        `;
    });
    forecastTypeControls.innerHTML = radiosHtml;
    
    // 3. イベントリスナーを設定
    areaSelect.addEventListener('change', displayWeatherData);
    // ラジオボタンの変更を検出
    forecastTypeControls.addEventListener('change', displayWeatherData); 
}

// ====================================================================
// データ取得と描画のメインロジック
// ====================================================================

/**
 * 選択された地域と予報期間に基づいてデータを取得し、表示を更新する
 */
async function displayWeatherData() {
    const selectedCode = areaSelect.value;
    
    // 現在チェックされているラジオボタンの値 (index: '0' または '1') を取得
    const selectedRadio = document.querySelector('input[name="forecastType"]:checked');
    const forecastTypeIndex = selectedRadio ? parseInt(selectedRadio.value) : 0;
    const isWeekly = forecastTypeIndex === 1;

    if (!selectedCode) {
        outputElement.innerHTML = `地域を選択してください。`;
        return;
    }

    const DATA_URL = `${JMA_BASE_URL}${selectedCode}.json`;
    outputElement.innerHTML = `<p class="loading">📡 ${DATA_URL} からデータを取得中...</p>`;
    
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error(`データの取得に失敗しました。HTTPステータス: ${response.status}`);
        }
        
        const jmaJson = await response.json();
        
        // 予報期間インデックスに基づいてデータセットを選択
        const forecastDataset = jmaJson?.[forecastTypeIndex];

        if (!forecastDataset) {
            throw new Error("選択された予報期間のデータセットが見つかりませんでした。");
        }
        
        // 必要なデータを抽出
        const weatherData = forecastDataset.timeSeries?.[0] || {}; // 天気・風・波 or 天気・降水確率
        const tempData = forecastDataset.timeSeries?.[1] || {}; // 気温 (週間予報でのみ使用)
        
        const timeDefines = weatherData.timeDefines || [];
        const areas = weatherData.areas || [];

        // ------------------ HTML生成 ------------------
        let htmlContent = `
            <p><strong>📢 発表元:</strong> ${forecastDataset.publishingOffice || 'N/A'}</p>
            <p><strong>📢 発表日時:</strong> ${formatDateTime(forecastDataset.reportDatetime)}</p>
            
            <h2>🗓️ 予報対象期間 (${timeDefines.length}回)</h2>
            <ul style="list-style-type: none; padding: 0;">
                ${timeDefines.map((time, index) => 
                    `<li><strong>${index + 1}回目:</strong> ${formatDateTime(time)}</li>`
                ).join('')}
            </ul>
            <hr />

            <h2>📍 細分区域別予報詳細</h2>
        `;

        areas.forEach(areaData => {
            const areaName = areaData.area?.name || '地域名不明';
            const weathers = areaData.weathers || [];
            const winds = areaData.winds || [];
            const waves = areaData.waves || [];
            const pops = areaData.pops || []; 
            
            // 気温データ（週間予報の場合）: timeSeries[1]のareasから地域名で検索
            let tempDataArea = {};
            if(isWeekly && tempData.areas) {
                tempDataArea = tempData.areas.find(a => a.area.name === areaData.area.name) || {};
            }

            htmlContent += `<div class="area-info"><h3>${areaName}</h3>`;
            
            timeDefines.forEach((time, i) => {
                
                let detailContent = '';
                const formattedTime = formatDateTime(time); // ★この行は維持
                
                if (!isWeekly) {
                    // 短期予報の場合 (天気, 風, 波)
                    detailContent = `
                        <li><strong>天気:</strong> ${weathers[i] || "情報なし"}</li>
                        <li><strong>風:</strong> ${winds[i] || "情報なし"}</li>
                        <li><strong>波:</strong> ${waves[i] || "情報なし"}</li>
                    `;
                } else {
                    // 週間予報の場合 (天気, 降水確率, 気温, 信頼度)
                    const minTemp = tempDataArea.tempsMin?.[i] || "---";
                    const maxTemp = tempDataArea.tempsMax?.[i] || "---";
                    
                    detailContent = `
                        <li><strong>天気:</strong> ${weathers[i] || "情報なし"}</li>
                        <li><strong>降水確率:</strong> ${pops[i] ? pops[i] + '%' : "情報なし"}</li>
                        <li><strong>気温:</strong> 最低 ${minTemp}°C / 最高 ${maxTemp}°C</li>
                        <li><strong>信頼度:</strong> ${areaData.reliabilities?.[i] || "---"}</li>
                    `;
                }

                htmlContent += `
                    <div class="time-info">
                        <h4>[${formattedTime}]</h4> <ul>${detailContent}</ul>
                    </div>
                `;
            });

            htmlContent += `</div>`;
        });

        outputElement.innerHTML = htmlContent;

    } catch (error) {
        outputElement.innerHTML = `<p class="error">❌ データの処理中にエラーが発生しました: ${error.message}</p>`;
        console.error("データ処理エラー:", error);
    }
}

// ページロード時に実行
document.addEventListener('DOMContentLoaded', () => {
    populateControls();
    // ページロード時の初期データ表示は行わず、ユーザーの選択を待つ
});
const db = firebase.firestore();

// ゾーンの名前マッピング
const getZoneName = (zone) => {
  const zoneMap = {
    1: 'High Left',
    2: 'High Middle',
    3: 'High Right',
    4: 'Middle Left',
    5: 'Middle Middle',
    6: 'Middle Right',
    7: 'Low Left',
    8: 'Low Middle',
    9: 'Low Right',
    11: 'Very High Left',
    12: 'Very High Right',
    13: 'Very Low Left',
    14: 'Very Low Right',
  };
  return zoneMap[zone] || 'Unknown';
};

// ストライクゾーンかどうか判定する
const isStrikeZone = (zone) => {
  // Zones 1-9はストライク、11-14はボール
  return zone !== undefined && zone >= 1 && zone <= 9;
};

// 状態管理
let pitches = [];
let notes = "";
let playerTryoutID = "";
let playerID = null; // 一致したプレイヤーID
let activePitchId = null;
let isAddingNewPitch = false;
let previousSpeed = "";

// DOM要素の参照を保持
const container = document.getElementById("pitching-content");
const zoneModal = document.getElementById("zone-modal");

// プレイヤーIDが存在するか確認する関数
async function checkPlayerExists(tryoutID) {
  const saveBtn = document.getElementById("save-btn");
  const errorMessage = document.getElementById("error-message");

  try {
    const playerDoc = await getPlayerByTryoutID(tryoutID);
    if (playerDoc) {
      playerID = playerDoc.playerID;
      if (errorMessage) {
        errorMessage.style.display = "none";
      }
      if (saveBtn) {
        saveBtn.disabled = false; // プレイヤーが存在する場合、保存ボタンを有効にする
      }
      console.log("✅ Player found, save button enabled.");
      return playerDoc;
    } else {
      playerID = null;
      if (errorMessage) {
        errorMessage.style.display = "block";
      }
      if (saveBtn) {
        saveBtn.disabled = true; // プレイヤーが存在しない場合、保存ボタンを無効にする
      }
      console.log("❌ Player not found, save button disabled.");
      return null;
    }
  } catch (error) {
    console.error("Error checking playerTryoutID:", error);
    playerID = null;
    if (saveBtn) {
      saveBtn.disabled = true; // エラー発生時は保存ボタンを無効にする
    }
    console.log("❌ Error occurred, save button disabled.");
    return null;
  }
}

// Tryout IDからプレイヤー情報を取得する
async function getPlayerByTryoutID(tryoutID) {
  const querySnapshot = await db.collection("users").where("playerTryoutID", "==", tryoutID).get();
  if (!querySnapshot.empty) {
    return querySnapshot.docs[0].data();
  }
  return null;
}

// UI関数: ピッチング評価ページのレンダリング
function renderPitchingPage() {
  container.innerHTML = '<h2 class="text-center">Pitching Evaluation</h2>';

  // プレイヤーTryout ID入力
  const playerInputDiv = document.createElement("div");
  playerInputDiv.className = "player-input-div";

  const playerLabel = document.createElement("label");
  playerLabel.textContent = "Player Tryout ID:";
  playerInputDiv.appendChild(playerLabel);

  const playerInput = document.createElement("input");
  playerInput.type = "text";
  playerInput.id = "player-id-input";
  playerInput.placeholder = "Enter Player Tryout ID";
  playerInput.value = playerTryoutID;
  playerInput.oninput = async (e) => {
    playerTryoutID = e.target.value.trim();
    console.log("🔍 Checking playerTryoutID:", playerTryoutID);
    
    // 入力に変更があれば500msディレイを設定（デバウンス処理）
    if (playerInput.debounceTimer) {
      clearTimeout(playerInput.debounceTimer);
    }
    
    playerInput.debounceTimer = setTimeout(async () => {
      await checkPlayerExists(playerTryoutID);
    }, 500);
  };

  playerInputDiv.appendChild(playerInput);
  container.appendChild(playerInputDiv);

  // エラーメッセージ（無効なplayerTryoutID用）
  const errorMessage = document.createElement("p");
  errorMessage.id = "error-message";
  errorMessage.style.color = "red";
  errorMessage.style.display = "none";
  errorMessage.textContent = "No player found with this tryout ID. Note: ID is case-sensitive.";
  container.appendChild(errorMessage);

  // 各ピッチのレンダリング
  const pitchesContainer = document.createElement("div");
  pitchesContainer.id = "pitches-container";
  
  pitches.forEach(pitch => {
    const pitchRow = document.createElement("div");
    pitchRow.className = "pitch-row";

    // 削除ボタン
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "remove-btn";
    deleteBtn.innerHTML = "❌";
    deleteBtn.onclick = () => {
      pitches = pitches.filter(p => p.id !== pitch.id);
      renderPitchingPage();
    };
    pitchRow.appendChild(deleteBtn);

    // スピード入力
    const speedInput = document.createElement("input");
    speedInput.className = "speed-input";
    speedInput.type = "number";
    speedInput.placeholder = "Speed";
    speedInput.value = pitch.speed || "";
    speedInput.oninput = (e) => {
      pitch.speed = e.target.value;
    };
    pitchRow.appendChild(speedInput);

    // 単位表示
    const unitText = document.createElement("span");
    unitText.className = "unit-text";
    unitText.textContent = "km/h";
    pitchRow.appendChild(unitText);

    // ゾーンが選択されている場合、ストライク/ボールバッジとゾーン表示
    if (pitch.zone) {
      // ストライク/ボールバッジ
      const badge = document.createElement("div");
      badge.className = `badge ${isStrikeZone(pitch.zone) ? 'strike-badge' : 'ball-badge'}`;
      badge.textContent = isStrikeZone(pitch.zone) ? 'Strike' : 'Ball';
      pitchRow.appendChild(badge);

      // ゾーン表示
      const zoneDisplay = document.createElement("div");
      zoneDisplay.className = "zone-display";

      const zoneText = document.createElement("span");
      zoneText.className = "zone-display-text";
      zoneText.textContent = getZoneName(pitch.zone);
      zoneDisplay.appendChild(zoneText);

      const editText = document.createElement("span");
      editText.className = "zone-edit-text";
      editText.textContent = "Edit";
      editText.onclick = () => editPitchZone(pitch.id);
      zoneDisplay.appendChild(editText);

      pitchRow.appendChild(zoneDisplay);
    } else {
      // ゾーン選択ボタン
      const zoneSelectButton = document.createElement("button");
      zoneSelectButton.className = "zone-select-button";
      zoneSelectButton.innerHTML = '<span class="zone-select-text">Select Zone</span>';
      zoneSelectButton.onclick = () => showZoneMatrix(pitch.id);
      pitchRow.appendChild(zoneSelectButton);
    }

    pitchesContainer.appendChild(pitchRow);
  });

  container.appendChild(pitchesContainer);

  // 「Add Pitch」ボタン
  const addPitchBtn = document.createElement("button");
  addPitchBtn.id = "add-pitch-btn";
  addPitchBtn.className = "btn";
  addPitchBtn.textContent = "+ Add Pitch";
  addPitchBtn.onclick = addPitch;
  container.appendChild(addPitchBtn);

  // メモフィールド
  const notesLabel = document.createElement("label");
  notesLabel.htmlFor = "notes";
  notesLabel.className = "block mt-4";
  notesLabel.textContent = "Notes:";
  container.appendChild(notesLabel);

  const notesInput = document.createElement("textarea");
  notesInput.id = "notes";
  notesInput.rows = 4;
  notesInput.placeholder = "Enter notes...";
  notesInput.className = "w-full mt-1";
  notesInput.value = notes;
  notesInput.oninput = (e) => {
    notes = e.target.value;
  };
  container.appendChild(notesInput);

  // 「Save All」ボタン
  const saveBtn = document.createElement("button");
  saveBtn.id = "save-btn";
  saveBtn.className = "btn mt-4";
  saveBtn.textContent = "Save All";
  saveBtn.disabled = !playerID;
  saveBtn.onclick = saveAll;
  container.appendChild(saveBtn);
}

// 新しいピッチを追加
function addPitch() {
  // 最後のピッチのスピード値を保存
  previousSpeed = pitches.length > 0 ? pitches[pitches.length - 1].speed : '';
  
  // 新しい追加モードをON
  isAddingNewPitch = true;
  
  // ゾーン選択モーダルを表示（まだ新しいピッチを作成しない）
  activePitchId = null;
  showZoneMatrix();
}

// 既存のピッチのゾーンを編集
function editPitchZone(pitchId) {
  isAddingNewPitch = false; // 編集モードを示す
  showZoneMatrix(pitchId);
}

// ゾーンマトリックスを表示
function showZoneMatrix(pitchId = null) {
  activePitchId = pitchId;
  zoneModal.classList.add('show');
}

// ゾーンマトリックスを非表示
function hideZoneMatrix() {
  zoneModal.classList.remove('show');
  activePitchId = null;
  isAddingNewPitch = false;
}

// ゾーンを選択
function selectZone(zone) {
  if (isAddingNewPitch) {
    // 新規追加モードの場合、ここで新しいピッチを作成
    const newPitch = {
      id: Date.now(),
      speed: previousSpeed,
      zone: zone
    };
    pitches.push(newPitch);
    
    // 新規追加モードをOFF
    isAddingNewPitch = false;
  } else if (activePitchId) {
    // 既存のピッチを編集（元のプロセス）
    const pitchToUpdate = pitches.find(p => p.id === activePitchId);
    if (pitchToUpdate) {
      pitchToUpdate.zone = zone;
    }
  }
  
  // モーダルを閉じる
  hideZoneMatrix();
  
  // 更新されたピッチ一覧を表示
  renderPitchingPage();
}

// すべてのデータを保存
async function saveAll() {
  console.log("📝 Save button clicked");
  
  // ログ出力（デバッグ用）
  console.log("🔍 Current playerTryoutID:", playerTryoutID);
  console.log("🔍 Matched playerID:", playerID);
  
  if (!playerID) {
    alert("No player found with this tryout ID. Note: ID is case-sensitive.");
    console.log("❌ No player found, aborting save.");
    return;
  }
  
  if (pitches.length === 0) {
    alert("Please add at least one pitch data.");
    return;
  }

  // データを整形する
  const formattedPitches = pitches.map(pitch => ({
    speed: pitch.speed,
    outcome: isStrikeZone(pitch.zone) ? 'Strike' : 'Ball',
    pitchingZone: pitch.zone,
  }));

  console.log("📊 Pitches to be saved:", formattedPitches);
  console.log("🗒️ Notes:", notes);

  try {
    console.log("📤 Attempting to save data to Firestore...");
    // hitting と同じコレクション構造に合わせる
    const docRef = await db.collection('pitching').add({
      playerTryoutID: playerTryoutID,
      playerID: playerID,
      pitches: formattedPitches,
      notes: notes,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log("✅ Data successfully saved to Firestore. Document ID:", docRef.id);
    alert('Pitching data saved!');

    // 保存後にフォームをクリア
    pitches = [];
    notes = '';
    renderPitchingPage();
  } catch (error) {
    console.error("❌ Error saving pitching data:", error);
    alert(`Failed to save. Error: ${error.message}`);
  }
}

// 初期ロード時とコンポーネント読み込み時の処理
document.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Pitching Page JS Loaded");
  
  // ヘッダーとフッターのロード
  fetch('../components/header.html')
    .then(response => response.text())
    .then(data => {
      document.getElementById('header-container').innerHTML = data;
      
      // ヘッダーメニューのイベントハンドラ設定
      window.toggleMenu = function() {
        const menu = document.getElementById('side-menu');
        menu.classList.toggle('hidden');
      };
      
      // ログアウト機能
      window.logout = function() {
        firebase.auth().signOut().then(() => {
          window.location.href = '../index.html';
        }).catch(error => {
          console.error('Logout error:', error);
        });
      };
    });
    
  fetch('../components/footer.html')
    .then(response => response.text())
    .then(data => {
      document.getElementById('footer-container').innerHTML = data;
    });
  
  // 初期ピッチを1つ追加しておく
  if (pitches.length === 0) {
    pitches.push({ id: 1, speed: '', zone: null });
  }
  
  renderPitchingPage();
  
  // ゾーン選択をグローバルスコープに公開
  window.selectZone = selectZone;
  window.hideZoneMatrix = hideZoneMatrix;
});

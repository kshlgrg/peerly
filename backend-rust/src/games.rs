use rand::seq::SliceRandom;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum GameState {
    #[serde(rename = "tic_tac_toe")]
    TicTacToe {
        players: [String; 2],
        turn: String,
        board: [Option<String>; 9],
        status: String,
        winner: Option<String>,
        message: String,
    },
    #[serde(rename = "connect_four")]
    ConnectFour {
        players: [String; 2],
        turn: String,
        board: Vec<Vec<Option<String>>>,
        status: String,
        winner: Option<String>,
        message: String,
    },
    #[serde(rename = "dice_race")]
    DiceRace {
        players: [String; 2],
        turn: String,
        positions: HashMap<String, u32>,
        last_roll: Option<LastRoll>,
        status: String,
        winner: Option<String>,
        message: String,
    },
    #[serde(rename = "loot_tiles")]
    LootTiles {
        players: [String; 2],
        turn: String,
        values: Vec<u32>,
        claimed: Vec<Option<String>>,
        scores: HashMap<String, u32>,
        status: String,
        winner: Option<String>,
        message: String,
    },
    #[serde(rename = "hot_takes")]
    HotTakes {
        players: [String; 2],
        current_question: usize,
        questions: Vec<String>,
        votes: HashMap<String, Option<bool>>,
        vibe_score: u32,
        status: String,
        winner: Option<String>,
        message: String,
    },
    #[serde(rename = "scribble")]
    Scribble {
        players: [String; 2],
        drawer: String,
        word: String,
        strokes: Vec<serde_json::Value>,
        scores: HashMap<String, u32>,
        status: String,
        winner: Option<String>,
        message: String,
    },
    #[serde(rename = "truth_dare")]
    TruthDare {
        players: [String; 2],
        turn: String,
        choice: Option<String>,
        prompt: Option<String>,
        aura: HashMap<String, i32>,
        status: String,
        winner: Option<String>,
        message: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LastRoll {
    pub player: String,
    pub value: u32,
}

fn other_p(players: &[String; 2], current: &str) -> String {
    if players[0] == current {
        players[1].clone()
    } else {
        players[0].clone()
    }
}

impl GameState {
    pub fn new(game_type: &str, first_id: &str, second_id: &str) -> Self {
        let mut rng = rand::thread_rng();
        match game_type {
            "connect_four" => GameState::ConnectFour {
                players: [first_id.to_string(), second_id.to_string()],
                turn: first_id.to_string(),
                board: vec![vec![None; 7]; 6],
                status: "playing".to_string(),
                winner: None,
                message: "Connect Four started. Drop discs, not standards.".to_string(),
            },
            "dice_race" => {
                let mut positions = HashMap::new();
                positions.insert(first_id.to_string(), 0);
                positions.insert(second_id.to_string(), 0);
                GameState::DiceRace {
                    players: [first_id.to_string(), second_id.to_string()],
                    turn: first_id.to_string(),
                    positions,
                    last_roll: None,
                    status: "playing".to_string(),
                    winner: None,
                    message: "Dice Race started. Server rolls, no fake luck allowed.".to_string(),
                }
            }
            "loot_tiles" => {
                let mut values: Vec<u32> = (1..=9).collect();
                values.shuffle(&mut rng);
                let mut scores = HashMap::new();
                scores.insert(first_id.to_string(), 0);
                scores.insert(second_id.to_string(), 0);
                GameState::LootTiles {
                    players: [first_id.to_string(), second_id.to_string()],
                    turn: first_id.to_string(),
                    values,
                    claimed: vec![None; 9],
                    scores,
                    status: "playing".to_string(),
                    winner: None,
                    message: "Loot Tiles started. Pick tiles, collect points, trust no square.".to_string(),
                }
            }
            "hot_takes" => {
                let mut questions = vec![
                    "Pineapple belongs on pizza and haters are cowardice personified.".to_string(),
                    "Voice notes longer than 20 seconds are an unsolicited podcast.".to_string(),
                    "Leaving people on read is a fundamental human right.".to_string(),
                    "Dark mode is superior even in direct sunlight.".to_string(),
                    "AI tools write cleaner code than 80% of humans.".to_string(),
                    "8 AM lectures should be banned under international conventions.".to_string(),
                ];
                questions.shuffle(&mut rng);
                let mut votes = HashMap::new();
                votes.insert(first_id.to_string(), None);
                votes.insert(second_id.to_string(), None);
                GameState::HotTakes {
                    players: [first_id.to_string(), second_id.to_string()],
                    current_question: 0,
                    questions,
                    votes,
                    vibe_score: 0,
                    status: "playing".to_string(),
                    winner: None,
                    message: "Vibe Check started. Vote honestly or face eternal cringe.".to_string(),
                }
            }
            "scribble" => {
                let words = ["AIRPODS", "RED FLAG", "CAFFEINE", "GHOST", "ALL NIGHTER", "CHAI", "CAT", "BRAINROT"];
                let chosen_word = words.choose(&mut rng).unwrap_or(&"RED FLAG").to_string();
                let mut scores = HashMap::new();
                scores.insert(first_id.to_string(), 0);
                scores.insert(second_id.to_string(), 0);
                GameState::Scribble {
                    players: [first_id.to_string(), second_id.to_string()],
                    drawer: first_id.to_string(),
                    word: chosen_word,
                    strokes: Vec::new(),
                    scores,
                    status: "playing".to_string(),
                    winner: None,
                    message: "Scribble started! Drawer: draw the word. Guesser: guess in chat!".to_string(),
                }
            }
            "truth_dare" => {
                let mut aura = HashMap::new();
                aura.insert(first_id.to_string(), 1000);
                aura.insert(second_id.to_string(), 1000);
                GameState::TruthDare {
                    players: [first_id.to_string(), second_id.to_string()],
                    turn: first_id.to_string(),
                    choice: None,
                    prompt: None,
                    aura,
                    status: "playing".to_string(),
                    winner: None,
                    message: "Truth or Dare initiated. Pick your poison or lose aura.".to_string(),
                }
            }
            _ => GameState::TicTacToe {
                players: [first_id.to_string(), second_id.to_string()],
                turn: first_id.to_string(),
                board: [None, None, None, None, None, None, None, None, None],
                status: "playing".to_string(),
                winner: None,
                message: "Tic Tac Toe started. Ancient game, modern ego damage.".to_string(),
            },
        }
    }

    pub fn players(&self) -> &[String; 2] {
        match self {
            GameState::TicTacToe { players, .. } => players,
            GameState::ConnectFour { players, .. } => players,
            GameState::DiceRace { players, .. } => players,
            GameState::LootTiles { players, .. } => players,
            GameState::HotTakes { players, .. } => players,
            GameState::Scribble { players, .. } => players,
            GameState::TruthDare { players, .. } => players,
        }
    }

    pub fn player_mark(&self, player_id: &str) -> String {
        let players = self.players();
        if players[0] == player_id {
            "A".to_string()
        } else {
            "B".to_string()
        }
    }

    pub fn apply_move(&mut self, player_id: &str, move_payload: &serde_json::Value) -> Result<(), String> {
        match self {
            GameState::TicTacToe {
                players,
                turn,
                board,
                status,
                winner,
                message,
            } => {
                if status != "playing" {
                    return Err("That game is already done. Start a new one.".to_string());
                }
                if turn != player_id {
                    return Err("Not your turn. The queue of destiny says wait.".to_string());
                }
                let idx = move_payload
                    .get("index")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Pick a valid square.".to_string())? as usize;
                if idx >= 9 || board[idx].is_some() {
                    return Err("That square is taken. Cheating attempt denied.".to_string());
                }

                let mark = if players[0] == player_id { "A" } else { "B" };
                board[idx] = Some(mark.to_string());

                let winning_lines = [
                    (0, 1, 2), (3, 4, 5), (6, 7, 8),
                    (0, 3, 6), (1, 4, 7), (2, 5, 8),
                    (0, 4, 8), (2, 4, 6),
                ];
                let mut win_mark = None;
                for (a, b, c) in winning_lines {
                    if let (Some(m1), Some(m2), Some(m3)) = (&board[a], &board[b], &board[c]) {
                        if m1 == m2 && m2 == m3 {
                            win_mark = Some(m1.clone());
                            break;
                        }
                    }
                }

                if let Some(wm) = win_mark {
                    *status = "finished".to_string();
                    *winner = Some(if wm == "A" { players[0].clone() } else { players[1].clone() });
                    *message = "Game over. Someone's ego just took structural damage.".to_string();
                } else if board.iter().all(|c| c.is_some()) {
                    *status = "finished".to_string();
                    *winner = Some("draw".to_string());
                    *message = "Draw. Nobody wins, everybody pretends that was strategy.".to_string();
                } else {
                    *turn = other_p(players, turn);
                    *message = "Move accepted. Your turn, professor chaos.".to_string();
                }
                Ok(())
            }
            GameState::ConnectFour {
                players,
                turn,
                board,
                status,
                winner,
                message,
            } => {
                if status != "playing" {
                    return Err("That game is already done. Start a new one.".to_string());
                }
                if turn != player_id {
                    return Err("Not your turn. The queue of destiny says wait.".to_string());
                }
                let column = move_payload
                    .get("column")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Pick a valid column.".to_string())? as usize;
                if column >= 7 {
                    return Err("Pick a valid column.".to_string());
                }

                let mut target_row = None;
                for row in (0..=5).rev() {
                    if board[row][column].is_none() {
                        target_row = Some(row);
                        break;
                    }
                }
                let target_row = target_row.ok_or_else(|| "That column is full. Gravity said no.".to_string())?;

                let mark = if players[0] == player_id { "A" } else { "B" };
                board[target_row][column] = Some(mark.to_string());

                let directions = [(0, 1), (1, 0), (1, 1), (1, -1)];
                let mut win_mark = None;
                for r in 0..6 {
                    for c in 0..7 {
                        if let Some(m) = &board[r][c] {
                            for (dr, dc) in directions {
                                let mut won = true;
                                for step in 1..4 {
                                    let nr = r as isize + dr * step;
                                    let nc = c as isize + dc * step;
                                    if nr < 0 || nr >= 6 || nc < 0 || nc >= 7 || board[nr as usize][nc as usize].as_ref() != Some(m) {
                                        won = false;
                                        break;
                                    }
                                }
                                if won {
                                    win_mark = Some(m.clone());
                                    break;
                                }
                            }
                        }
                    }
                }

                if let Some(wm) = win_mark {
                    *status = "finished".to_string();
                    *winner = Some(if wm == "A" { players[0].clone() } else { players[1].clone() });
                    *message = "Game over. Someone's ego just took structural damage.".to_string();
                } else if board[0].iter().all(|c| c.is_some()) {
                    *status = "finished".to_string();
                    *winner = Some("draw".to_string());
                    *message = "Draw. Nobody wins, everybody pretends that was strategy.".to_string();
                } else {
                    *turn = other_p(players, turn);
                    *message = "Move accepted. Your turn, professor chaos.".to_string();
                }
                Ok(())
            }
            GameState::DiceRace {
                players,
                turn,
                positions,
                last_roll,
                status,
                winner,
                message,
            } => {
                if status != "playing" {
                    return Err("That game is already done. Start a new one.".to_string());
                }
                if turn != player_id {
                    return Err("Not your turn. The queue of destiny says wait.".to_string());
                }
                let roll = rand::thread_rng().gen_range(1..=6);
                let current_pos = positions.entry(player_id.to_string()).or_insert(0);
                *current_pos = (*current_pos + roll).min(24);
                let new_pos = *current_pos;
                let mark = if players[0] == player_id { "A" } else { "B" };

                *last_roll = Some(LastRoll {
                    player: mark.to_string(),
                    value: roll,
                });

                if new_pos >= 24 {
                    *status = "finished".to_string();
                    *winner = Some(player_id.to_string());
                    *message = "Game over. Someone's ego just took structural damage.".to_string();
                } else {
                    *turn = other_p(players, turn);
                    *message = "Move accepted. Your turn, professor chaos.".to_string();
                }
                Ok(())
            }
            GameState::LootTiles {
                players,
                turn,
                values,
                claimed,
                scores,
                status,
                winner,
                message,
            } => {
                if status != "playing" {
                    return Err("That game is already done. Start a new one.".to_string());
                }
                if turn != player_id {
                    return Err("Not your turn. The queue of destiny says wait.".to_string());
                }
                let idx = move_payload
                    .get("index")
                    .and_then(|v| v.as_u64())
                    .ok_or_else(|| "Pick a valid tile.".to_string())? as usize;
                if idx >= 9 || claimed[idx].is_some() {
                    return Err("That tile is already looted. Hands off.".to_string());
                }

                let mark = if players[0] == player_id { "A" } else { "B" };
                claimed[idx] = Some(mark.to_string());
                let val = values[idx];
                *scores.entry(player_id.to_string()).or_insert(0) += val;

                if claimed.iter().all(|c| c.is_some()) {
                    *status = "finished".to_string();
                    let s0 = scores.get(&players[0]).cloned().unwrap_or(0);
                    let s1 = scores.get(&players[1]).cloned().unwrap_or(0);
                    if s0 == s1 {
                        *winner = Some("draw".to_string());
                        *message = "Draw. Nobody wins, everybody pretends that was strategy.".to_string();
                    } else if s0 > s1 {
                        *winner = Some(players[0].clone());
                        *message = "Game over. Someone's ego just took structural damage.".to_string();
                    } else {
                        *winner = Some(players[1].clone());
                        *message = "Game over. Someone's ego just took structural damage.".to_string();
                    }
                } else {
                    *turn = other_p(players, turn);
                    *message = "Move accepted. Your turn, professor chaos.".to_string();
                }
                Ok(())
            }
            GameState::HotTakes {
                players,
                current_question,
                questions,
                votes,
                vibe_score,
                status,
                winner,
                message,
            } => {
                if status != "playing" {
                    return Err("That vibe check is finished.".to_string());
                }
                let vote = move_payload.get("vote").and_then(|v| v.as_bool()).ok_or_else(|| "Vote agree or disagree.".to_string())?;
                votes.insert(player_id.to_string(), Some(vote));

                let v0 = votes.get(&players[0]).and_then(|&v| v);
                let v1 = votes.get(&players[1]).and_then(|&v| v);

                if let (Some(a), Some(b)) = (v0, v1) {
                    if a == b {
                        *vibe_score += 1;
                        *message = "Vibe match! You two actually agree on something.".to_string();
                    } else {
                        *message = "Disagreement recorded. The simulation is fracturing.".to_string();
                    }
                    *current_question += 1;
                    if *current_question >= questions.len() {
                        *status = "finished".to_string();
                        *winner = Some("draw".to_string());
                        *message = format!("Vibe check complete! Compatibility: {}/{}", vibe_score, questions.len());
                    } else {
                        votes.insert(players[0].clone(), None);
                        votes.insert(players[1].clone(), None);
                    }
                } else {
                    *message = "Vote locked. Waiting for your partner's spicy opinion...".to_string();
                }
                Ok(())
            }
            GameState::Scribble {
                players,
                drawer,
                word,
                strokes,
                scores,
                status,
                winner,
                message,
            } => {
                if status != "playing" {
                    return Err("Scribble game is done.".to_string());
                }
                let action = move_payload.get("action").and_then(|v| v.as_str()).unwrap_or("");
                if action == "stroke" {
                    if player_id != drawer {
                        return Err("Only the drawer can draw!".to_string());
                    }
                    if let Some(data) = move_payload.get("data") {
                        strokes.push(data.clone());
                    }
                    return Ok(());
                }
                if action == "clear" {
                    if player_id == drawer {
                        strokes.clear();
                    }
                    return Ok(());
                }
                if action == "guess" {
                    if player_id == drawer {
                        return Err("Drawer cannot guess their own masterpiece.".to_string());
                    }
                    let guess = move_payload.get("guess").and_then(|v| v.as_str()).unwrap_or("").trim().to_uppercase();
                    if guess == *word {
                        *scores.entry(player_id.to_string()).or_insert(0) += 100;
                        *scores.entry(drawer.clone()).or_insert(0) += 50;
                        *message = format!("🔥 CORRECT! The word was {}. +100 Aura Points!", word);
                        // Swap drawer and pick next word
                        let next_drawer = other_p(players, drawer);
                        let words = ["AIRPODS", "RED FLAG", "CAFFEINE", "GHOST", "ALL NIGHTER", "CHAI", "CAT", "BRAINROT"];
                        *word = words.choose(&mut rand::thread_rng()).unwrap_or(&"CHAI").to_string();
                        *drawer = next_drawer;
                        strokes.clear();

                        if scores.values().any(|&s| s >= 300) {
                            *status = "finished".to_string();
                            *winner = Some(player_id.to_string());
                            *message = "Game Over! Master of Scribble has been crowned!".to_string();
                        }
                    } else {
                        *message = format!("❌ '{}' is wrong! Keep guessing!", guess);
                    }
                    return Ok(());
                }
                Err("Unknown scribble action.".to_string())
            }
            GameState::TruthDare {
                players,
                turn,
                choice,
                prompt,
                aura,
                status: _status,
                winner: _winner,
                message,
            } => {
                let action = move_payload.get("action").and_then(|v| v.as_str()).unwrap_or("");
                if action == "pick" {
                    if player_id != turn {
                        return Err("Not your turn to pick!".to_string());
                    }
                    let cat = move_payload.get("choice").and_then(|v| v.as_str()).unwrap_or("truth");
                    *choice = Some(cat.to_string());
                    let mut rng = rand::thread_rng();
                    if cat == "truth" {
                        let truths = [
                            "What is the most delusional lie currently on your resume or IG?",
                            "Have you stalked an ex or crush from a burner account this month?",
                            "What is the pettiest reason you have ever ghosted or skipped someone?",
                            "Rate your current mental stability out of 10 and defend your grade.",
                            "What is the most illegal thing you did on campus that nobody found out?",
                        ];
                        *prompt = Some(truths.choose(&mut rng).unwrap().to_string());
                    } else {
                        let dares = [
                            "Send the last photo taken in your camera roll right now in chat.",
                            "Turn on mic and do your best unhinged impression of a campus professor.",
                            "Text your best friend 'I know what you did' and do not reply for 5 minutes.",
                            "Do 10 rapid pushups right now on camera or confess your biggest cringe moment.",
                            "Speak with an exaggerated British accent for the next 3 chat turns.",
                        ];
                        *prompt = Some(dares.choose(&mut rng).unwrap().to_string());
                    }
                    *message = format!("Prompt delivered: {}. Complete or chicken out?", cat.to_uppercase());
                    return Ok(());
                }
                if action == "complete" {
                    if player_id != turn {
                        return Err("Not your turn!".to_string());
                    }
                    *aura.entry(player_id.to_string()).or_insert(1000) += 500;
                    *message = "🔥 RESPECT! Prompt completed. +500 Aura Points!".to_string();
                    *turn = other_p(players, turn);
                    *choice = None;
                    *prompt = None;
                    return Ok(());
                }
                if action == "forfeit" {
                    if player_id != turn {
                        return Err("Not your turn!".to_string());
                    }
                    *aura.entry(player_id.to_string()).or_insert(1000) -= 500;
                    *message = "💀 CHICKENED OUT! -500 Aura Points. Emotional damage inflicted.".to_string();
                    *turn = other_p(players, turn);
                    *choice = None;
                    *prompt = None;
                    return Ok(());
                }
                Err("Unknown truth/dare action.".to_string())
            }
        }
    }

    pub fn serialize_for(&self, viewer_id: &str) -> serde_json::Value {
        let players = self.players();
        let you = self.player_mark(viewer_id);
        match self {
            GameState::TicTacToe {
                turn,
                board,
                status,
                winner,
                message,
                ..
            } => {
                let turn_mark = if players[0] == *turn { "A" } else { "B" };
                let win_mark = winner.as_ref().map(|w| {
                    if w == "draw" {
                        "draw".to_string()
                    } else if w == &players[0] {
                        "A".to_string()
                    } else {
                        "B".to_string()
                    }
                });
                serde_json::json!({
                    "type": "tic_tac_toe",
                    "you": you,
                    "turn": turn_mark,
                    "status": status,
                    "winner": win_mark,
                    "message": message,
                    "board": board,
                })
            }
            GameState::ConnectFour {
                turn,
                board,
                status,
                winner,
                message,
                ..
            } => {
                let turn_mark = if players[0] == *turn { "A" } else { "B" };
                let win_mark = winner.as_ref().map(|w| {
                    if w == "draw" {
                        "draw".to_string()
                    } else if w == &players[0] {
                        "A".to_string()
                    } else {
                        "B".to_string()
                    }
                });
                serde_json::json!({
                    "type": "connect_four",
                    "you": you,
                    "turn": turn_mark,
                    "status": status,
                    "winner": win_mark,
                    "message": message,
                    "board": board,
                })
            }
            GameState::DiceRace {
                turn,
                positions,
                last_roll,
                status,
                winner,
                message,
                ..
            } => {
                let turn_mark = if players[0] == *turn { "A" } else { "B" };
                let win_mark = winner.as_ref().map(|w| {
                    if w == "draw" {
                        "draw".to_string()
                    } else if w == &players[0] {
                        "A".to_string()
                    } else {
                        "B".to_string()
                    }
                });
                let mut pos_map = serde_json::Map::new();
                pos_map.insert("A".to_string(), serde_json::json!(positions.get(&players[0]).cloned().unwrap_or(0)));
                pos_map.insert("B".to_string(), serde_json::json!(positions.get(&players[1]).cloned().unwrap_or(0)));

                serde_json::json!({
                    "type": "dice_race",
                    "you": you,
                    "turn": turn_mark,
                    "status": status,
                    "winner": win_mark,
                    "message": message,
                    "positions": pos_map,
                    "lastRoll": last_roll,
                    "target": 24,
                })
            }
            GameState::LootTiles {
                turn,
                values,
                claimed,
                scores,
                status,
                winner,
                message,
                ..
            } => {
                let turn_mark = if players[0] == *turn { "A" } else { "B" };
                let win_mark = winner.as_ref().map(|w| {
                    if w == "draw" {
                        "draw".to_string()
                    } else if w == &players[0] {
                        "A".to_string()
                    } else {
                        "B".to_string()
                    }
                });
                let revealed: Vec<Option<u32>> = claimed
                    .iter()
                    .enumerate()
                    .map(|(i, c)| if c.is_some() { Some(values[i]) } else { None })
                    .collect();

                let mut score_map = serde_json::Map::new();
                score_map.insert("A".to_string(), serde_json::json!(scores.get(&players[0]).cloned().unwrap_or(0)));
                score_map.insert("B".to_string(), serde_json::json!(scores.get(&players[1]).cloned().unwrap_or(0)));

                serde_json::json!({
                    "type": "loot_tiles",
                    "you": you,
                    "turn": turn_mark,
                    "status": status,
                    "winner": win_mark,
                    "message": message,
                    "claimed": claimed,
                    "revealed": revealed,
                    "scores": score_map,
                })
            }
            GameState::HotTakes {
                current_question,
                questions,
                votes,
                vibe_score,
                status,
                winner,
                message,
                ..
            } => {
                let question = questions.get(*current_question).cloned().unwrap_or_default();
                let my_vote = votes.get(viewer_id).and_then(|&v| v);
                serde_json::json!({
                    "type": "hot_takes",
                    "you": you,
                    "turn": you,
                    "status": status,
                    "winner": winner,
                    "message": message,
                    "question": question,
                    "questionIndex": current_question,
                    "totalQuestions": questions.len(),
                    "myVote": my_vote,
                    "vibeScore": vibe_score,
                })
            }
            GameState::Scribble {
                drawer,
                word,
                strokes,
                scores,
                status,
                winner,
                message,
                ..
            } => {
                let is_drawer = viewer_id == drawer;
                let masked_word = if is_drawer {
                    word.clone()
                } else {
                    word.chars()
                        .map(|c| if c == ' ' { ' ' } else { '_' })
                        .collect()
                };
                let mut score_map = serde_json::Map::new();
                score_map.insert("A".to_string(), serde_json::json!(scores.get(&players[0]).cloned().unwrap_or(0)));
                score_map.insert("B".to_string(), serde_json::json!(scores.get(&players[1]).cloned().unwrap_or(0)));

                serde_json::json!({
                    "type": "scribble",
                    "you": you,
                    "turn": if is_drawer { you.clone() } else { (if you == "A" { "B" } else { "A" }).to_string() },
                    "status": status,
                    "winner": winner,
                    "message": message,
                    "isDrawer": is_drawer,
                    "word": masked_word,
                    "strokes": strokes,
                    "scores": score_map,
                })
            }
            GameState::TruthDare {
                turn,
                choice,
                prompt,
                aura,
                status,
                winner,
                message,
                ..
            } => {
                let turn_mark = if players[0] == *turn { "A" } else { "B" };
                let mut aura_map = serde_json::Map::new();
                aura_map.insert("A".to_string(), serde_json::json!(aura.get(&players[0]).cloned().unwrap_or(1000)));
                aura_map.insert("B".to_string(), serde_json::json!(aura.get(&players[1]).cloned().unwrap_or(1000)));

                serde_json::json!({
                    "type": "truth_dare",
                    "you": you,
                    "turn": turn_mark,
                    "status": status,
                    "winner": winner,
                    "message": message,
                    "choice": choice,
                    "prompt": prompt,
                    "aura": aura_map,
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tic_tac_toe_flow() {
        let mut game = GameState::new("tic_tac_toe", "p1", "p2");
        assert_eq!(game.player_mark("p1"), "A");
        assert_eq!(game.player_mark("p2"), "B");

        assert!(game.apply_move("p1", &serde_json::json!({"index": 0})).is_ok());
        assert!(game.apply_move("p2", &serde_json::json!({"index": 3})).is_ok());
        assert!(game.apply_move("p1", &serde_json::json!({"index": 1})).is_ok());
        assert!(game.apply_move("p2", &serde_json::json!({"index": 4})).is_ok());
        assert!(game.apply_move("p1", &serde_json::json!({"index": 2})).is_ok());

        let state = game.serialize_for("p1");
        assert_eq!(state["status"], "finished");
        assert_eq!(state["winner"], "A");
    }

    #[test]
    fn test_hot_takes_flow() {
        let mut game = GameState::new("hot_takes", "p1", "p2");
        assert!(game.apply_move("p1", &serde_json::json!({"vote": true})).is_ok());
        assert!(game.apply_move("p2", &serde_json::json!({"vote": true})).is_ok());

        let state = game.serialize_for("p1");
        assert_eq!(state["vibeScore"], 1);
    }
}

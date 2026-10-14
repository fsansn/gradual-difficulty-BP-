
import { world, system } from "@minecraft/server";

// 20ゲームティックごと（通常は約1秒ごと）に更新
system.runInterval(() => {
    for (const player of world.getPlayers()) {
        try {
            // プレイヤーの座標
            const { x, y, z } = player.location;

            // 現在の経験値レベル
            const level = player.level;

            // 水平座標のうち、原点から遠い方を採用
            const distance = Math.max(
                Math.abs(x),
                Math.abs(z)
            );

            // 難易度補正値
            const difficulty =
                0.01 * distance / (level + 1);

            // アクションバーに表示
            player.onScreenDisplay.setActionBar(
                `Lv.${level} ` +
                `XYZ(${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}) ` +
                `補正値: ${difficulty.toFixed(2)}`
            );
        } catch (error) {
            console.warn(
                `[DifficultyAddon] ${player.name}: ${error}`
            );
        }
    }
}, 20);

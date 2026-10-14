
import { world, system } from "@minecraft/server";

// 前回確認したプレイヤーの総経験値
const lastTotalXp = new Map();

// 座標から距離を計算する。
// 水平座標のうち、原点から遠い方を採用する。
function getDistance(player) {
    const { x, z } = player.location;
    return Math.max(Math.abs(x), Math.abs(z));
}

// 難易度補正値 c を計算する。
// 距離が100以下なら100、レベルが1以下なら1として扱う。
function getDifficulty(player) {
    const distance = Math.max(getDistance(player), 100);
    const level = Math.max(player.level, 1);

    return 0.01 * distance / level;
}

// ダメージ発生前に、与ダメージと被ダメージを補正する。
world.beforeEvents.entityHurt.subscribe((event) => {
    try {
        let damage = event.damage;

        const attacker = event.damageSource.damagingEntity;
        const victim = event.hurtEntity;

        // プレイヤーが攻撃した場合：与ダメージを c 除算
        if (attacker?.typeId === "minecraft:player") {
            damage /= getDifficulty(attacker);
        }

        // プレイヤーが攻撃を受ける場合：被ダメージを c 倍
        if (victim.typeId === "minecraft:player") {
            damage *= getDifficulty(victim);
        }

        event.damage = damage;
    } catch (error) {
        console.warn(`[GradualDifficulty] ダメージ補正エラー: ${error}`);
    }
});

// 1ゲームティックごとに経験値と表示を更新する。
system.runInterval(() => {
    const players = world.getPlayers();
    const onlineIds = new Set(players.map((player) => player.id));

    // 切断したプレイヤーの記録を削除する。
    for (const id of lastTotalXp.keys()) {
        if (!onlineIds.has(id)) {
            lastTotalXp.delete(id);
        }
    }

    for (const player of players) {
        try {
            const { x, y, z } = player.location;
            const level = player.level;
            const distance = getDistance(player);
            const difficulty = getDifficulty(player);
            const totalXp = player.getTotalXp();

            if (!lastTotalXp.has(player.id)) {
                // 初回は現在の経験値を記録する。
                lastTotalXp.set(player.id, totalXp);
            } else {
                const previousXp = lastTotalXp.get(player.id);
                const gainedXp = totalXp - previousXp;

                if (gainedXp > 0) {
                    // 距離に応じた追加経験値。
                    // 追加分を整数に切り捨てる。
                    const bonusXp = Math.floor(
                        gainedXp * 0.01 * distance
                    );

                    if (bonusXp > 0) {
                        player.addExperience(bonusXp);
                    }
                }

                // ボーナス加算後の値を記録し、二重加算を防ぐ。
                lastTotalXp.set(player.id, player.getTotalXp());
            }

            player.onScreenDisplay.setActionBar(
                `Lv.${level} ` +
                `XYZ(${Math.floor(x)}, ${Math.floor(y)}, ${Math.floor(z)}) ` +
                `補正値: ${difficulty.toFixed(2)}`
            );
        } catch (error) {
            console.warn(
                `[GradualDifficulty] ${player.name}: ${error}`
            );
        }
    }
}, 1);

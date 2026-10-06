export interface Theme {
    name: string;

    ui: {
        primaryBg: string;
        secondaryBg: string;
        canvasBg: string;
        primaryAccent: string;
        secondaryAccent: string;
        enemyColor: string;
        warningColor: string;
        disabledColor: string;
        systemMessageColor: string;
        textPrimary: string;
        textMuted: string;
        panelShadow: string;
        panelHighlight: string;
        locationNameColor: string;
        itemNameColor: string;
        personNameColor: string;
    };

    entities: {
        player: {
            body: string;
            face: string;
            healthBg: string;
            healthHigh: string;
            healthMid: string;
            healthLow: string;
        };
        skeleton: {
            body: string;
            features: string;
            healthBg: string;
            healthBar: string;
        };
    };

    worldMap: {
        background: string;
        terrain: {
            grass: string;
            forest: string;
            mountain: string;
            water: string;
            desert: string;
        };
        unknown: string;
        gridLines: string;
        playerMarker: string;
        iconScale: {
            character: number;
            village: number;
        };
        questionMarkOffset: {
            x: number;
            y: number;
        };
        gridOffset: {
            x: number;
            y: number;
        };
        gridDimensions: {
            columns: number;
            rows: number;
        };
        viewportSize: {
            width: number;
            height: number;
        };
        cellSize: {
            default: number;
            min: number;
            max: number;
            zoomStep: number;
            panStepCells: number;
        };
        cellTravelMinutes: number;
        cellCornerRadius: number;
        connectorRadius: number;
    };

    battleMap: {
        background: string;
        tileDark: string;
        tileLight: string;
        currentEntityPlayer: string;
        currentEntityEnemy: string;
        selectedEnemy: string;
        gridBorders: string;
        obstacleFill: string;
        obstacleEdge: string;
        obstacleShadow: string;
        gridSize: {
            columns: number;
            rows: number;
        };
    };

    quest: {
        feedbackMessageDurationMs: number;
        nameGeneration: {
            maxWordsByDomain: {
                location: number;
                artifact: number;
                character: number;
                monster: number;
                mainQuest: number;
            };
            wordLengthWeightsByDomain: {
                location: Record<number, number>;
                artifact: Record<number, number>;
                character: Record<number, number>;
                monster: Record<number, number>;
                mainQuest: Record<number, number>;
            };
        };
    };
}

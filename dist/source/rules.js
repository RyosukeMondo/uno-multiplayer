"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Rule values:
 * 0 => invalid move
 * 1 => normal value on value move
 * 2 => +2
 * 3 => skip
 * 4 => reverse
 * 5 => wild mystery color
 * 6 => -2
 */
class Rules {
    constructor(card1, card2, currentColor) {
        this.card1 = card1;
        this.card2 = card2;
        this.currentColor = currentColor;
    }
    getRule() {
        const { card1, card2, currentColor } = this;
        if (!card1.isSpecial && !card2.isSpecial) {
            return (card1.color === card2.color || card1.value === card2.value) ? 1 : 0;
        }
        if (card1.isSpecial && !card2.isSpecial) {
            return (currentColor === card2.color) ? 1 : 0;
        }
        if (!card1.isSpecial && card2.isSpecial) {
            if (card2.color === "black") {
                return card2.value === 1 ? 6 : 5;
            }
            return (card1.color === card2.color) ? this.getSpecialCardRule(card2) : 0;
        }
        if (card1.isSpecial && card2.isSpecial) {
            if (card2.color === "black") {
                return card2.value === 1 ? 6 : 5;
            }
            if (card2.color === currentColor || (card1.value === card2.value && card1.color !== "black")) {
                return this.getSpecialCardRule(card2);
            }
            return 0;
        }
        return 0;
    }
    getSpecialCardRule(card) {
        switch (card.value) {
            case 1:
                return 3;
            case 2:
                return 2;
            case 3:
                return 4;
            default:
                return 6;
        }
    }
}
exports.default = Rules;

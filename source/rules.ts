import Card from './card';

/**
 * Enum for Rule values.
 */
export enum Rule {
  INVALID = 0,
  NORMAL = 1,
  PLUS_TWO = 2,
  HOP = 3,
  REVERSE = 4,
  WILD_COLOR = 5,
  MINUS_ONE = 6
}

class Rules {
  card1: Card;
  card2: Card;
  currentColor: string;

  constructor(card1: Card, card2: Card, currentColor: string) {
    this.card1 = card1;
    this.card2 = card2;
    this.currentColor = currentColor;
  }

  getRule(): Rule {
    const { card1, card2, currentColor } = this;

    if (!card1.isSpecial && !card2.isSpecial) {
      return (card1.color === card2.color || card1.value === card2.value) ? Rule.NORMAL : Rule.INVALID;
    }

    if (card1.isSpecial && !card2.isSpecial) {
      return (currentColor === card2.color) ? Rule.NORMAL : Rule.INVALID;
    }

    if (!card1.isSpecial && card2.isSpecial) {
      if (card2.color === "black") {
        return card2.value === 1 ? Rule.MINUS_ONE : Rule.WILD_COLOR;
      }
      return (card1.color === card2.color) ? this.getSpecialCardRule(card2) : Rule.INVALID;
    }

    if (card1.isSpecial && card2.isSpecial) {
      if (card2.color === "black") {
        return card2.value === 1 ? Rule.MINUS_ONE : Rule.WILD_COLOR;
      }
      if (card2.color === currentColor || (card1.value === card2.value && card1.color !== "black")) {
        return this.getSpecialCardRule(card2);
      }
      return Rule.INVALID;
    }

    return Rule.INVALID;
  }

  private getSpecialCardRule(card: Card): Rule {
    switch (card.value) {
      case 1:
        return Rule.HOP;
      case 2:
        return Rule.PLUS_TWO;
      case 3:
        return Rule.REVERSE;
      default:
        return Rule.MINUS_ONE;
    }
  }
}

export default Rules;

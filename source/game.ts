import Card from './card';
import Deck from './deck';
import Player from './player';
import Rules, { Rule } from './rules';
import mongoose from 'mongoose';
import { gameModel } from '../model/db-model';


export enum PlayCode {
  NOT_YOUR_TURN = -1,
  FALSE = 0,
  TRUE = 1,
  PLUS_TWO = 2,
  MINUS_ONE = 4,
  CHOOSE_COLOR = 3,
  SKIP = 5,
  INVERSE = 6,
  GAME_END = 7
}

class Game {
  deck: Deck = new Deck();

  async createGame(gameId: mongoose.Types.ObjectId, players: Array<Player>) {
    const numberOfPlayers = players.length;
    if (numberOfPlayers < 2) throw new Error("can't start a game with less than 2 players");
    const game = await gameModel.findById(gameId);
    for (let i = 0; i < numberOfPlayers; i++) {
      // draw 5 cards for each player 
      for (let j = 0; j < 5; j++) {
        let card: Card = this.deck.drawCard();
        game.players[i].cards.push(card);
      }
    }
    // intialize current card on board with random value
    game.currentCard = this.deck.drawNonSpecialCard();
    game.currentColor = game.currentCard.color;
    game.numberOfPlayers = numberOfPlayers;
    game.isReversed = false;
    game.gameStart = true;
    await game.save();
    return game;
  }

  calculateNextTurn(game) {
    game.players[game.currentPlayerTurn].drawCard = 0;
    game.players[game.currentPlayerTurn].canEnd = false;

    if (game.isReversed && game.currentPlayerTurn == 0) game.currentPlayerTurn = game.numberOfPlayers - 1;
    else {
      if (game.isReversed) game.currentPlayerTurn--;
      else game.currentPlayerTurn = (game.currentPlayerTurn + 1) % game.numberOfPlayers;
    }
    game.players[game.currentPlayerTurn].canEnd = false;
  }

  addCard(game, card: Card): void {
    game.players[game.currentPlayerTurn].cards.push(card);
  }

  removeCard(game, index: number): void {
    const currentPlayer = game.players[game.currentPlayerTurn];

    if (currentPlayer.cards.length > 0) {
      if (index >= 0 && index < currentPlayer.cards.length) {
        currentPlayer.cards.splice(index, 1);
      } else {
        currentPlayer.cards.splice(0, 1);
      }
    }
  }


  async play(gameId: mongoose.Types.ObjectId, playerIndex: number, cardIndex: number, card: Card, playerId: string): Promise<PlayCode> {
      card.isSpecial = card.isspecial;
      const game = await gameModel.findById(gameId);

      if (game.currentPlayerTurn != playerIndex || game.players[game.currentPlayerTurn].playerId != playerId) {
          return PlayCode.NOT_YOUR_TURN;
      }

      // Check if the player is trying to play a special card as their last card
      if (game.players[game.currentPlayerTurn].cards.length === 1 && card.isSpecial) {
          return PlayCode.FALSE;  // Invalid operation
      }

      game.players[game.currentPlayerTurn].drawCard = 0;
      let rule: Rules = new Rules(game.currentCard, card, game.currentColor);
      let ruleNumber: Rule = rule.getRule();

      if (ruleNumber === Rule.INVALID) {
          return PlayCode.FALSE;
      }

      game.players[game.currentPlayerTurn].canEnd = true;
      game.currentColor = card.color;
      game.currentCard = card;
      this.removeCard(game, cardIndex);

      if (game.players[game.currentPlayerTurn].cards.length == 0) {
          await game.save();
          return PlayCode.GAME_END;
      }

      game.players[game.currentPlayerTurn].score += card.isSpecial ? 50 : 20;
      if (game.players[game.currentPlayerTurn].score >= 500) {
          await game.save();
          return PlayCode.GAME_END;
      }

      switch (ruleNumber) {
          case Rule.NORMAL:
              this.calculateNextTurn(game);
              await game.save();
              return PlayCode.TRUE;
          case Rule.PLUS_TWO:
              this.calculateNextTurn(game);
              this.addCard(game, this.deck.drawCard());
              this.addCard(game, this.deck.drawCard());
              await game.save();
              return PlayCode.PLUS_TWO;
          case Rule.HOP:
              this.calculateNextTurn(game);
              this.calculateNextTurn(game);
              await game.save();
              return PlayCode.SKIP;
          case Rule.REVERSE:
              if (game.numberOfPlayers > 2) {
                  game.isReversed = !game.isReversed;
                  this.calculateNextTurn(game);
              }
              await game.save();
              return PlayCode.INVERSE;
          case Rule.WILD_COLOR:
              await game.save();
              return PlayCode.CHOOSE_COLOR;
          case Rule.MINUS_ONE:
              this.calculateNextTurn(game);
              const nextPlayerIndex = game.currentPlayerTurn;
              game.players[nextPlayerIndex].cards = game.players[nextPlayerIndex].cards.slice(1);
              if (game.players[nextPlayerIndex].cards.length === 0) {
                  await game.save();
                  return PlayCode.GAME_END;  // Next player wins
              }
              await game.save();
              return PlayCode.MINUS_ONE;
      }
  }


  async changeCurrentColor(gameId: mongoose.Types.ObjectId, color: string, playerIndex: number, playerId: string) {
    const game = await gameModel.findById(gameId);
    if (game.currentPlayerTurn != playerIndex) return 0;
    if (game.players[game.currentPlayerTurn].playerId != playerId) return 0;
    if (["red", "blue", "white"].includes(color)) {
      game.currentColor = color;
      this.calculateNextTurn(game);
      await game.save();
      return game;
    }
    return 0;
  }

  async drawCard(gameId: mongoose.Types.ObjectId, playerIndex: number, playerId: string) {
    const game = await gameModel.findById(gameId);
    if (!game) return 0;
    if (game.currentPlayerTurn != playerIndex || game.players[playerIndex].drawCard >= 2 || game.players[playerIndex].playerId != playerId) return 0;
    game.players[playerIndex].cards.push(this.deck.drawCard());
    game.players[playerIndex].drawCard++;
    if (game.players[playerIndex].drawCard == 2) game.players[playerIndex].canEnd = true;
    await game.save();
    return 1;
  }

  async resetGame(game) {
    const numberOfPlayers = game.players.length;
    if (numberOfPlayers < 2) throw new Error("can't start a game with less than 2 players");
    for (let i = 0; i < numberOfPlayers; i++) {
      game.players[i].cards = [];
      game.players[i].drawCard = 0;
      game.players[i].canEnd = false;
      game.players[i].score = 0;

      // draw 7 cards for each player 
      for (let j = 0; j < 5; j++) {
        let card: Card = this.deck.drawCard();
        game.players[i].cards.push(card);
      }
    }
    // intialize current card on board with random value
    game.currentCard = this.deck.drawNonSpecialCard();
    game.currentColor = game.currentCard.color;
    game.gameStart = true;
    game.numberOfPlayers = game.players.length;
    game.isReversed = false;
    game.currentPlayerTurn = 0;
    await game.save();
    return game;
  }
}

export default Game;

import Card from './card';
import Deck from './deck';
import Player from './player';
import Rules from './rules';
import mongoose from 'mongoose';
import { gameModel } from '../model/db-model';

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

  /**
   * -1 => not your turn
   * 0 => false
   * 1 => true
   * 2 => +2
   * 4 => -2
   * 3 => choose color
   * 5 => skip
   * 6 => inverse
   * 7 => game end
   */
  async play(gameId: mongoose.Types.ObjectId, playerIndex: Number, cardIndex: number, card: Card, playerId: string) {
    card.isSpecial = card.isspecial;
    const game = await gameModel.findById(gameId);
    if (game.currentPlayerTurn != playerIndex || game.players[game.currentPlayerTurn].playerId != playerId) return -1;
    game.players[game.currentPlayerTurn].drawCard = 0;
    let rule: Rules = new Rules(game.currentCard, card, game.currentColor);
    let ruleNumber: number = rule.getRule();
    if (!ruleNumber) return 0;
    game.players[game.currentPlayerTurn].canEnd = true;
    game.currentColor = card.color;
    game.currentCard = card;
    this.removeCard(game, cardIndex);
    if (game.players[game.currentPlayerTurn].cards.length == 0) {
      await game.save();
      return 7;
    }
    if (ruleNumber == 1) {
      game.players[game.currentPlayerTurn].score += 20;
      if (game.players[game.currentPlayerTurn].score >= 500) {
        await game.save();
        return 7;
      }
      this.calculateNextTurn(game);
      await game.save();
      return 1;
    } else if (ruleNumber == 2) {
      game.players[game.currentPlayerTurn].score += 20;
      if (game.players[game.currentPlayerTurn].score >= 500) {
        await game.save();
        return 7;
      }
      this.calculateNextTurn(game);
      // draw 2 cards for the next player
      this.addCard(game, this.deck.drawCard());
      this.addCard(game, this.deck.drawCard());
      await game.save();
      return 2;
    } else if (ruleNumber == 3) {
      game.players[game.currentPlayerTurn].score += 20;
      if (game.players[game.currentPlayerTurn].score >= 500) {
        await game.save();
        return 7;
      }
      // skip player
      this.calculateNextTurn(game);
      this.calculateNextTurn(game);

      await game.save();
      return 5;
    } else if (ruleNumber == 4) {
      game.players[game.currentPlayerTurn].score += 20;
      if (game.players[game.currentPlayerTurn].score >= 500) {
        await game.save();
        return 7;
      }
      // reverse 
      // reverse work as skip in case of 2 players 
      if (game.numberOfPlayers > 2) {
        game.isReversed = !game.isReversed;
        this.calculateNextTurn(game);
      }
      await game.save();
      return 6;
    } else if (ruleNumber == 5) {
      game.players[game.currentPlayerTurn].score += 50;
      if (game.players[game.currentPlayerTurn].score >= 500) {
        await game.save();
        return 7;
      }
      await game.save();
      return 3;
    } else if (ruleNumber == 6) {
      game.players[game.currentPlayerTurn].score += 50;
      if (game.players[game.currentPlayerTurn].score >= 500) {
        await game.save();
        return 7;
      }
      this.calculateNextTurn(game);
      // -2 current user
      this.removeCard(game, cardIndex);
      this.removeCard(game, cardIndex);
      
      // Check if the current player has no cards left
      if (game.players[game.currentPlayerTurn].cards.length == 0) {
        await game.save();
        return 7;
      }

      game.isReversed = !game.isReversed;
      this.calculateNextTurn(game);
      game.isReversed = !game.isReversed;
      await game.save();
      return 4;
    }
  }

  async changCurrentColor(gameId: mongoose.Types.ObjectId, color: string, playerIndex: number, playerId: string) {
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

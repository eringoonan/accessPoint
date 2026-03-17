// pages/gamesPage.js
import Game from '../models/Game.js';
import {getGames, enrichGames} from '../api/gamesApi.js';
import { getAllConditions } from '../api/conditionsApi';
import {createGamesCard} from '../components/gamesCard.js';
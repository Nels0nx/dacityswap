import type { Theme } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/archivo/wdth-italic.css';
import '@fontsource-variable/jetbrains-mono';
import './custom.css';
import EscrowSimulator from './components/EscrowSimulator.vue';
import FeeCalculator from './components/FeeCalculator.vue';
import FlowDiagram from './components/FlowDiagram.vue';
import HomePage from './components/HomePage.vue';
import SequenceDiagram from './components/SequenceDiagram.vue';
import SettlementBars from './components/SettlementBars.vue';
import StateDiagram from './components/StateDiagram.vue';
import Layout from './Layout.vue';

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('HomePage', HomePage);
    app.component('EscrowSimulator', EscrowSimulator);
    app.component('FeeCalculator', FeeCalculator);
    app.component('StateDiagram', StateDiagram);
    app.component('FlowDiagram', FlowDiagram);
    app.component('SequenceDiagram', SequenceDiagram);
    app.component('SettlementBars', SettlementBars);
  },
} satisfies Theme;

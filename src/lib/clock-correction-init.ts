// Side-effect module: must be imported before anything that loads the auth client.
import { initClockCorrection } from "./clock-skew";

initClockCorrection();

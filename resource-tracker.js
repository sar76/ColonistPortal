// Resource tracking functionality for Catan Card Tracker
export class ResourceTracker {
  constructor() {
    // Resource types and their display symbols
    this.RESOURCE_TYPES = [
      { key: "lumber", symbol: "🪵" },
      { key: "brick", symbol: "🧱" },
      { key: "wool", symbol: "🐑" },
      { key: "grain", symbol: "🌾" },
      { key: "ore", symbol: "⛏️" },
    ];

    // In-memory player resource map
    this.playerResources = {};

    // Event log for UI display
    this.eventLogs = [];

    // Current player username (for resolving "You" references)
    this.currentPlayerUsername = null;

    // Their constants for parsing
    this.initialPlacementDoneMessage = "Giving out starting resources";
    this.placeInitialSettlementSnippet = "placed a";
    this.startingResourcesSnippet = "received starting resources:";
    this.receivedResourcesSnippet = "got:";
    this.builtSnippet = "built a";
    this.boughtSnippet = " bought ";
    this.tradeBankGaveSnippet = "gave bank:";
    this.tradeBankTookSnippet = "and took";
    this.stoleAllOfSnippet = "stole ";
    this.discardedSnippet = "discarded";
    this.tradedWithSnippet = " with: ";
    this.tradedSnippet = " traded: ";
    this.tradeGiveForSnippet = "for:";
    this.stoleFromYouSnippet = "You stole:";
    this.youStoleSnippet = "from you";
    this.stoleFromSnippet = " stole:  from ";
    this.robberSnippet = " moved robber to";
    this.yearOfPleantlySnippet = "took from bank";

    // Resource mapping
    this.wood = "lumber";
    this.stone = "ore";
    this.wheat = "grain";
    this.brick = "brick";
    this.sheep = "wool";
    this.robber = "robber";
    this.resourceTypes = [
      this.wood,
      this.brick,
      this.sheep,
      this.wheat,
      this.stone,
    ];

    // Players
    this.players = [];
    this.player_colors = {};

    // Message offset
    this.MSG_OFFSET = 0;

    // Theft tracking (their logic)
    this.zeros = [0, 0, 0, 0, 0];
    this.zero_deltas = [this.zeros, this.zeros, this.zeros, this.zeros];
    this.potential_state_deltas = [];

    // Pending username
    this.pendingUsername = null;
  }

  // Utility: get resource key from alt text
  getResourceKeyFromAlt(alt) {
    const found = this.RESOURCE_TYPES.find(
      (r) => r.key.toLowerCase() === alt.toLowerCase()
    );
    return found ? found.key : null;
  }

  // Deep copy 2D array (their utility)
  deep_copy_2d_array(array) {
    return array.map((sub_array) => Array.from(sub_array));
  }

  // Add array of arrays (their utility)
  add_array_of_arrays(array0, array1) {
    return array0.map((row, outer_index) =>
      row.map(
        (element, inner_index) => array1[outer_index][inner_index] + element
      )
    );
  }

  // Check if any negative values in array
  areAnyNegative(arrayOfArrays) {
    for (let row of arrayOfArrays) {
      for (let element of row) {
        if (element < 0) {
          return true;
        }
      }
    }
    return false;
  }

  // Check if all values are zero
  areAllZero(arrayOfArrays) {
    for (let row of arrayOfArrays) {
      for (let element of row) {
        if (element !== 0) {
          return false;
        }
      }
    }
    return true;
  }

  // Should keep potential state delta
  shouldKeep(potential_resources, delta) {
    if (this.areAnyNegative(potential_resources) || this.areAllZero(delta)) {
      return false;
    }
    return true;
  }

  // Convert player resources to array
  playerResourcesToArray(playerResourcesDict) {
    var result = [];
    for (const resource of this.resourceTypes) {
      result.push(playerResourcesDict[resource]);
    }
    return result;
  }

  // Convert resources dict to array
  resourcesToArray(resourcesDict) {
    var result = [];
    for (const player of this.players) {
      result.push(this.playerResourcesToArray(resourcesDict[player]));
    }
    return result;
  }

  // Convert resources array to dict
  resourcesToDict(resourcesArray) {
    var result = {};
    for (const [playerIndex, playerResources] of resourcesArray.entries()) {
      var playerResourceDict = {};
      for (const [resourceIndex, resourceAmount] of playerResources.entries()) {
        playerResourceDict[this.resourceTypes[resourceIndex]] = resourceAmount;
      }
      result[this.players[playerIndex]] = playerResourceDict;
    }
    return result;
  }

  // Steal all of a resource from all players
  stealAllOfResource(receivingPlayer, resource) {
    for (var plyr of this.players) {
      if (plyr !== receivingPlayer) {
        this.playerResources[receivingPlayer][resource] +=
          this.playerResources[plyr][resource];
        this.playerResources[plyr][resource] = 0;
      }
    }
  }

  // Transfer resource between players
  transferResource(srcPlayer, destPlayer, resource, quantity = 1) {
    this.playerResources[srcPlayer][resource] -= quantity;
    this.playerResources[destPlayer][resource] += quantity;
  }

  // Check if it's a monopoly card
  isMonopoly(text) {
    const arr = text.replace(":", "").split(" ");
    if (arr[1] === "stole" && !isNaN(parseInt(arr[2]))) {
      return true;
    }
    return false;
  }

  // Check if it's a known steal (robust to colon or space)
  isKnownSteal(textContent) {
    // Match 'You stole', 'You stole:', 'stole from you', etc.
    const lower = textContent.toLowerCase();
    return (
      lower.includes("you stole") ||
      lower.includes("stole from you") ||
      lower.includes("you stole:") ||
      lower.includes("you stole ")
    );
  }

  // Check if it's a known steal with resource info (their logic)
  isKnownStealWithResource(textContent) {
    // Only consider it a known steal if we can see the resource being stolen
    const lower = textContent.toLowerCase();
    const hasResourceInfo =
      textContent.includes(":") ||
      Array.from(textContent.matchAll(/stole\s+([^:]+)/g)).length > 0;
    return (
      (lower.includes("you stole") || lower.includes("stole from you")) &&
      hasResourceInfo
    );
  }

  // Review thefts (their logic)
  reviewThefts() {
    const resourcesArray = this.resourcesToArray(this.playerResources);
    const before_len = this.potential_state_deltas.length;

    this.potential_state_deltas_temp = this.potential_state_deltas.filter(
      (delta) =>
        this.shouldKeep(this.add_array_of_arrays(resourcesArray, delta), delta)
    );

    if (this.potential_state_deltas_temp.length === 0) {
      if (this.areAnyNegative(resourcesArray)) {
        console.error(
          "Couldn't resolve thefts correctly. There almost certainly is a bug parsing messages"
        );
        this.addEventLog(
          "[DEBUG] Couldn't resolve thefts - potential parsing bug"
        );
      }
    }
    this.potential_state_deltas = this.potential_state_deltas_temp;

    if (this.potential_state_deltas.length === 1) {
      const actual_resources_delta = this.potential_state_deltas[0];
      const actual_resources = this.add_array_of_arrays(
        actual_resources_delta,
        resourcesArray
      );
      if (this.areAnyNegative(actual_resources)) {
        throw Error("Couldn't resolve thefts correctly");
      }
      this.playerResources = this.resourcesToDict(actual_resources);
      this.potential_state_deltas = [];
      this.addEventLog("[DEBUG] Resolved ambiguous theft - applied delta");
    }

    // Debug logging
    if (this.potential_state_deltas.length > 0) {
      this.addEventLog(
        `[DEBUG] ${this.potential_state_deltas.length} potential theft deltas remaining`
      );
    }
  }

  // Parse "got" message (improved for text and images)
  parseGotMessage(pElement) {
    var textContent = pElement.textContent;
    // Accept both with and without colon for compatibility
    if (!textContent.includes("got")) {
      return;
    }
    var player = textContent.split(" ")[0];
    if (!this.playerResources[player]) {
      console.log("Failed to parse player...", player, this.playerResources);
      return;
    }
    // Try to increment resources from images
    var images = Array.from(pElement.getElementsByTagName("img"));
    let foundAny = false;
    for (var img of images) {
      if (img.src.includes("card_wool")) {
        this.playerResources[player][this.sheep] += 1;
        foundAny = true;
      } else if (img.src.includes("card_lumber")) {
        this.playerResources[player][this.wood] += 1;
        foundAny = true;
      } else if (img.src.includes("card_brick")) {
        this.playerResources[player][this.brick] += 1;
        foundAny = true;
      } else if (img.src.includes("card_ore")) {
        this.playerResources[player][this.stone] += 1;
        foundAny = true;
      } else if (img.src.includes("card_grain")) {
        this.playerResources[player][this.wheat] += 1;
        foundAny = true;
      }
    }
    // If no images, parse resource from text
    if (!foundAny) {
      const words = textContent.split(" ").slice(2); // after "player got"
      for (const word of words) {
        if (word === "brick") this.playerResources[player][this.brick] += 1;
        else if (word === "ore") this.playerResources[player][this.stone] += 1;
        else if (word === "grain" || word === "wheat")
          this.playerResources[player][this.wheat] += 1;
        else if (word === "wool" || word === "sheep")
          this.playerResources[player][this.sheep] += 1;
        else if (word === "lumber" || word === "wood")
          this.playerResources[player][this.wood] += 1;
      }
    }
    this.addEventLog(
      `${player} got ${
        textContent.split(" ").slice(2).join(" ") || "resources"
      }`
    );
  }

  // Parse "built" message
  parseBuiltMessage(pElement) {
    var textContent = pElement.textContent;
    if (!textContent.includes(this.builtSnippet)) {
      return;
    }
    var images = Array.from(pElement.getElementsByTagName("img"));
    var player = textContent.split(" ")[0];
    if (!this.playerResources[player]) {
      console.log("Failed to parse player...", player, this.playerResources);
      return;
    }
    for (var img of images) {
      if (img.src.includes("road")) {
        this.playerResources[player][this.wood] -= 1;
        this.playerResources[player][this.brick] -= 1;
        this.addEventLog(`${player} built a road`);
      } else if (img.src.includes("settlement")) {
        this.playerResources[player][this.wood] -= 1;
        this.playerResources[player][this.brick] -= 1;
        this.playerResources[player][this.sheep] -= 1;
        this.playerResources[player][this.wheat] -= 1;
        this.addEventLog(`${player} built a settlement`);
      } else if (img.src.includes("city")) {
        this.playerResources[player][this.stone] -= 3;
        this.playerResources[player][this.wheat] -= 2;
        this.addEventLog(`${player} built a city`);
      }
    }
  }

  // Parse "bought" message
  parseBoughtMessage(pElement) {
    var textContent = pElement.textContent;
    if (!textContent.includes(this.boughtSnippet)) {
      return;
    }
    var images = Array.from(pElement.getElementsByTagName("img"));
    var player = textContent.split(" ")[0];
    if (!this.playerResources[player]) {
      console.log("Failed to parse player...", player, this.playerResources);
      return;
    }
    for (var img of images) {
      if (img.src.includes("card_devcardback")) {
        this.playerResources[player][this.sheep] -= 1;
        this.playerResources[player][this.wheat] -= 1;
        this.playerResources[player][this.stone] -= 1;
        this.addEventLog(`${player} bought a development card`);
      }
    }
  }

  // Parse Year of Plenty message (robust image-based parsing)
  parseYearOfPleantyMessage(pElement) {
    var textContent = pElement.textContent;
    if (!textContent.includes(this.yearOfPleantlySnippet)) {
      return;
    }
    var player = textContent.split(" ")[0];
    if (!this.playerResources[player]) {
      console.log("Failed to parse player...", player, this.playerResources);
      return;
    }
    // Robust image-based parsing
    var images = Array.from(pElement.getElementsByTagName("img"));
    let foundAny = false;
    for (var img of images) {
      if (img.alt === "wool" || img.alt === "sheep") {
        this.playerResources[player][this.sheep] += 1;
        foundAny = true;
      } else if (img.alt === "lumber" || img.alt === "wood") {
        this.playerResources[player][this.wood] += 1;
        foundAny = true;
      } else if (img.alt === "brick") {
        this.playerResources[player][this.brick] += 1;
        foundAny = true;
      } else if (img.alt === "ore") {
        this.playerResources[player][this.stone] += 1;
        foundAny = true;
      } else if (img.alt === "grain" || img.alt === "wheat") {
        this.playerResources[player][this.wheat] += 1;
        foundAny = true;
      }
    }
    // Fallback: parse from text
    if (!foundAny) {
      const words = textContent.split(" ").slice(3); // after 'player took from bank'
      for (const word of words) {
        if (word === "brick") this.playerResources[player][this.brick] += 1;
        else if (word === "ore") this.playerResources[player][this.stone] += 1;
        else if (word === "grain" || word === "wheat")
          this.playerResources[player][this.wheat] += 1;
        else if (word === "wool" || word === "sheep")
          this.playerResources[player][this.sheep] += 1;
        else if (word === "lumber" || word === "wood")
          this.playerResources[player][this.wood] += 1;
      }
    }
    this.addEventLog(`${player} used Year of Plenty`);
  }

  // Parse trade bank message (robust image-based parsing)
  parseTradeBankMessage(pElement) {
    var textContent = pElement.textContent;
    if (
      !textContent.includes("gave bank") ||
      !textContent.includes("and took")
    ) {
      return;
    }
    var player = textContent.split(" ")[0];
    if (!this.playerResources[player]) {
      console.log("Failed to parse player...", player, this.playerResources);
      return;
    }
    // Use innerHTML to get the HTML structure
    var innerHTML = pElement.innerHTML;
    var gaveBankHTML = innerHTML.split("gave bank")[1].split("and took")[0];
    var andTookHTML = innerHTML.split("and took")[1];

    // Helper to extract resource alts from HTML
    function extractResourceAlts(html) {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      return Array.from(tempDiv.querySelectorAll("img")).map((img) => img.alt);
    }

    const gaveAlts = extractResourceAlts(gaveBankHTML);
    const tookAlts = extractResourceAlts(andTookHTML);

    // Update resources
    for (const alt of gaveAlts) {
      if (alt === "brick") this.playerResources[player][this.brick] -= 1;
      else if (alt === "ore") this.playerResources[player][this.stone] -= 1;
      else if (alt === "grain" || alt === "wheat")
        this.playerResources[player][this.wheat] -= 1;
      else if (alt === "wool" || alt === "sheep")
        this.playerResources[player][this.sheep] -= 1;
      else if (alt === "lumber" || alt === "wood")
        this.playerResources[player][this.wood] -= 1;
    }
    for (const alt of tookAlts) {
      if (alt === "brick") this.playerResources[player][this.brick] += 1;
      else if (alt === "ore") this.playerResources[player][this.stone] += 1;
      else if (alt === "grain" || alt === "wheat")
        this.playerResources[player][this.wheat] += 1;
      else if (alt === "wool" || alt === "sheep")
        this.playerResources[player][this.sheep] += 1;
      else if (alt === "lumber" || alt === "wood")
        this.playerResources[player][this.wood] += 1;
    }

    // Log the event
    const gaveStr = gaveAlts.length ? gaveAlts.join(" ") : "(none)";
    const tookStr = tookAlts.length ? tookAlts.join(" ") : "(none)";
    this.addEventLog(
      `${player} traded with bank: gave ${gaveStr}, took ${tookStr}`
    );
  }

  // Parse monopoly card (robust image-based parsing)
  parseStoleAllOfMessage(pElement) {
    var textContent = pElement.textContent;
    if (!this.isMonopoly(textContent)) {
      return;
    }
    var player = textContent.split(" ")[0];
    if (!this.playerResources[player]) {
      console.log("Failed to parse player...", player, this.playerResources);
      return;
    }
    // Robust image-based parsing
    var images = Array.from(pElement.getElementsByTagName("img"));
    let foundAny = false;
    for (var img of images) {
      if (img.alt === "wool" || img.alt === "sheep") {
        this.stealAllOfResource(player, this.sheep);
        foundAny = true;
      } else if (img.alt === "lumber" || img.alt === "wood") {
        this.stealAllOfResource(player, this.wood);
        foundAny = true;
      } else if (img.alt === "brick") {
        this.stealAllOfResource(player, this.brick);
        foundAny = true;
      } else if (img.alt === "ore") {
        this.stealAllOfResource(player, this.stone);
        foundAny = true;
      } else if (img.alt === "grain" || img.alt === "wheat") {
        this.stealAllOfResource(player, this.wheat);
        foundAny = true;
      }
    }
    // Fallback: parse from text
    if (!foundAny) {
      const words = textContent.split(" ").slice(3); // after 'player stole N:'
      for (const word of words) {
        if (word === "brick") this.stealAllOfResource(player, this.brick);
        else if (word === "ore") this.stealAllOfResource(player, this.stone);
        else if (word === "grain" || word === "wheat")
          this.stealAllOfResource(player, this.wheat);
        else if (word === "wool" || word === "sheep")
          this.stealAllOfResource(player, this.sheep);
        else if (word === "lumber" || word === "wood")
          this.stealAllOfResource(player, this.wood);
      }
    }
    this.addEventLog(`${player} used Monopoly card`);
  }

  // Parse discarded message
  parseDiscardedMessage(pElement) {
    var textContent = pElement.textContent;
    if (!textContent.includes(this.discardedSnippet)) {
      return;
    }
    var player = textContent
      .replace(this.receivedResourcesSnippet, "")
      .split(" ")[0];
    if (!this.playerResources[player]) {
      console.log("Failed to parse player...", player, this.playerResources);
      return;
    }
    var images = Array.from(pElement.getElementsByTagName("img"));
    for (var img of images) {
      if (img.src.includes("card_wool")) {
        this.playerResources[player][this.sheep] -= 1;
      } else if (img.src.includes("card_lumber")) {
        this.playerResources[player][this.wood] -= 1;
      } else if (img.src.includes("card_brick")) {
        this.playerResources[player][this.brick] -= 1;
      } else if (img.src.includes("card_ore")) {
        this.playerResources[player][this.stone] -= 1;
      } else if (img.src.includes("card_grain")) {
        this.playerResources[player][this.wheat] -= 1;
      }
    }
    this.addEventLog(`${player} discarded resources`);
  }

  // Parse traded message
  parseTradedMessage(pElement, prevElement) {
    var textContent = pElement.textContent;
    if (!textContent.includes(this.tradedWithSnippet)) {
      return;
    }
    var tradingPlayer = textContent.split(this.tradedSnippet)[0];
    var agreeingPlayer = textContent.split(this.tradedWithSnippet)[1];
    if (
      !this.playerResources[tradingPlayer] ||
      !this.playerResources[agreeingPlayer]
    ) {
      console.log(
        "Failed to parse players...",
        tradingPlayer,
        agreeingPlayer,
        this.playerResources
      );
      return;
    }
    var innerHTML = pElement.innerHTML;
    var wantstogive = innerHTML
      .slice(0, innerHTML.indexOf(this.tradeGiveForSnippet))
      .split("<img");
    var givefor = innerHTML
      .slice(innerHTML.indexOf(this.tradeGiveForSnippet))
      .split("<img");
    for (var imgStr of wantstogive) {
      if (imgStr.includes("card_wool")) {
        this.transferResource(tradingPlayer, agreeingPlayer, this.sheep);
      } else if (imgStr.includes("card_lumber")) {
        this.transferResource(tradingPlayer, agreeingPlayer, this.wood);
      } else if (imgStr.includes("card_brick")) {
        this.transferResource(tradingPlayer, agreeingPlayer, this.brick);
      } else if (imgStr.includes("card_ore")) {
        this.transferResource(tradingPlayer, agreeingPlayer, this.stone);
      } else if (imgStr.includes("card_grain")) {
        this.transferResource(tradingPlayer, agreeingPlayer, this.wheat);
      }
    }
    for (var imgStr of givefor) {
      if (imgStr.includes("card_wool")) {
        this.transferResource(agreeingPlayer, tradingPlayer, this.sheep);
      } else if (imgStr.includes("card_lumber")) {
        this.transferResource(agreeingPlayer, tradingPlayer, this.wood);
      } else if (imgStr.includes("card_brick")) {
        this.transferResource(agreeingPlayer, tradingPlayer, this.brick);
      } else if (imgStr.includes("card_ore")) {
        this.transferResource(agreeingPlayer, tradingPlayer, this.stone);
      } else if (imgStr.includes("card_grain")) {
        this.transferResource(agreeingPlayer, tradingPlayer, this.wheat);
      }
    }
    this.addEventLog(`${tradingPlayer} traded with ${agreeingPlayer}`);
  }

  // Helper to resolve 'You' or 'you' to the actual username
  resolvePlayerName(name) {
    if (typeof name !== "string") return name;
    if (name.trim().toLowerCase() === "you") {
      // First check if we have a stored current player username
      if (
        this.currentPlayerUsername &&
        this.playerResources[this.currentPlayerUsername]
      ) {
        this.addEventLog(
          `[DEBUG] Resolved 'You' to stored username '${this.currentPlayerUsername}'`
        );
        return this.currentPlayerUsername;
      }

      // Try to find the current player from the DOM first
      const currentPlayer = this.getCurrentPlayerFromDOM();
      if (currentPlayer) {
        this.currentPlayerUsername = currentPlayer; // Store it for future use
        this.addEventLog(
          `[DEBUG] Resolved 'You' to '${currentPlayer}' from DOM`
        );
        return currentPlayer;
      }

      // Fallback: try to find the player with the most resources (likely the user)
      const candidates = Object.keys(this.playerResources);
      if (candidates.length === 1) {
        this.currentPlayerUsername = candidates[0]; // Store it for future use
        this.addEventLog(
          `[DEBUG] Resolved 'You' to '${candidates[0]}' (only player)`
        );
        return candidates[0];
      }

      // Try to find the player whose name matches the browser's username (if available)
      // For now, just return the first player and log it
      const fallbackPlayer = candidates[0] || name;
      this.currentPlayerUsername = fallbackPlayer; // Store it for future use
      this.addEventLog(
        `[DEBUG] Resolved 'You' to '${fallbackPlayer}' (fallback)`
      );
      return fallbackPlayer;
    }
    return name;
  }

  // Set current player username manually (for debugging or UI input)
  setCurrentPlayerUsername(username) {
    this.pendingUsername = username; // Always remember the user's input
    if (this.playerResources[username]) {
      this.currentPlayerUsername = username;
      this.pendingUsername = null;
      this.addEventLog(`[DEBUG] Set current player to '${username}'`);
      return true;
    } else {
      this.addEventLog(
        `[DEBUG] Will set current player to '${username}' as soon as they appear in the game log`
      );
      return false;
    }
  }

  // Call this after any player is added to playerResources
  checkPendingUsernameActivation() {
    if (this.pendingUsername && this.playerResources[this.pendingUsername]) {
      this.currentPlayerUsername = this.pendingUsername;
      this.addEventLog(
        `[DEBUG] Activated pending username '${this.pendingUsername}' as current player`
      );
      this.pendingUsername = null;
    }
  }

  // Get current player from DOM (try to find the active player)
  getCurrentPlayerFromDOM() {
    try {
      // Look for the current player indicator in the game UI
      // This might be in different places depending on the game state

      // Method 1: Look for "Your turn" or similar indicators
      const turnIndicators = document.querySelectorAll("*");
      for (const element of turnIndicators) {
        if (element.textContent && element.textContent.includes("Your turn")) {
          // Try to find the player name nearby
          const parent =
            element.closest('[class*="player"]') || element.parentElement;
          if (parent) {
            const playerName = parent.textContent.match(/([A-Za-z0-9_]+)/);
            if (playerName && this.playerResources[playerName[1]]) {
              return playerName[1];
            }
          }
        }
      }

      // Method 2: Look for the player name in the header or profile area
      const profileElements = document.querySelectorAll(
        '[id*="profile"], [class*="profile"], [id*="username"], [class*="username"]'
      );
      for (const element of profileElements) {
        const text = element.textContent.trim();
        if (text && this.playerResources[text]) {
          return text;
        }
      }

      // Method 3: Look for the player name in the game header
      const headerElements = document.querySelectorAll("header *, .header *");
      for (const element of headerElements) {
        const text = element.textContent.trim();
        if (text && this.playerResources[text]) {
          return text;
        }
      }

      // Method 4: Analyze game logs to find "You" patterns
      return this.getCurrentPlayerFromLogs();
    } catch (error) {
      console.error(
        "[Catan Card Tracker] Error getting current player from DOM:",
        error
      );
      return null;
    }
  }

  // Analyze game logs to determine which player is "You"
  getCurrentPlayerFromLogs() {
    try {
      // Look for game log entries that contain "You" or "Your"
      const logElements = document.querySelectorAll(
        'div[class*="O8TLknGehHkVfT5IRcHW"]'
      );

      for (const logElement of logElements) {
        const text = logElement.textContent;

        // Look for patterns that indicate the current player
        if (
          text.includes("You rolled") ||
          text.includes("Your turn") ||
          text.includes("You built") ||
          text.includes("You bought") ||
          text.includes("You traded") ||
          text.includes("You stole")
        ) {
          // Find the player name in this log entry
          const nameSpan = logElement.querySelector(
            'span[style*="font-weight:600"]'
          );
          if (nameSpan) {
            const playerName = nameSpan.textContent.trim();
            if (playerName && this.playerResources[playerName]) {
              this.addEventLog(
                `[DEBUG] Found current player '${playerName}' from log analysis`
              );
              return playerName;
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error(
        "[Catan Card Tracker] Error analyzing logs for current player:",
        error
      );
      return null;
    }
  }

  // Parse stole from you message (improved logic with UI debug logging)
  parseStoleFromYouMessage(pElement, prevElement) {
    var textContent = pElement.textContent;
    if (!this.isKnownStealWithResource(textContent)) {
      return;
    }
    var splitText = textContent.split(" ");
    var stealingPlayer = splitText[0];
    var targetPlayer = splitText.slice(-1)[0];
    stealingPlayer = this.resolvePlayerName(stealingPlayer);
    targetPlayer = this.resolvePlayerName(targetPlayer);

    // Debug: log player names and resource map
    this.addEventLog(
      `[DEBUG] parseStoleFromYouMessage called: stealingPlayer='${stealingPlayer}', targetPlayer='${targetPlayer}', playerResources keys=[${Object.keys(
        this.playerResources
      ).join(", ")}]`
    );

    if (
      !this.playerResources[stealingPlayer] ||
      !this.playerResources[targetPlayer]
    ) {
      this.addEventLog(
        `[DEBUG] Failed to parse players: stealingPlayer='${stealingPlayer}', targetPlayer='${targetPlayer}', playerResources keys=[${Object.keys(
          this.playerResources
        ).join(", ")}]`
      );
      return;
    }

    // Only proceed if we can clearly identify the resource being stolen
    var images = Array.from(pElement.getElementsByTagName("img"));
    let foundAny = false;
    for (var img of images) {
      if (img.alt === "wool" || img.alt === "sheep") {
        this.transferResource(targetPlayer, stealingPlayer, this.sheep);
        foundAny = true;
      } else if (img.alt === "lumber" || img.alt === "wood") {
        this.transferResource(targetPlayer, stealingPlayer, this.wood);
        foundAny = true;
      } else if (img.alt === "brick") {
        this.transferResource(targetPlayer, stealingPlayer, this.brick);
        foundAny = true;
      } else if (img.alt === "ore") {
        this.transferResource(targetPlayer, stealingPlayer, this.stone);
        foundAny = true;
      } else if (img.alt === "grain" || img.alt === "wheat") {
        this.transferResource(targetPlayer, stealingPlayer, this.wheat);
        foundAny = true;
      }
    }

    // Try to parse resource from text if no images
    if (!foundAny) {
      for (const word of splitText) {
        if (word === "brick") {
          this.transferResource(targetPlayer, stealingPlayer, this.brick);
          foundAny = true;
        } else if (word === "ore") {
          this.transferResource(targetPlayer, stealingPlayer, this.stone);
          foundAny = true;
        } else if (word === "grain" || word === "wheat") {
          this.transferResource(targetPlayer, stealingPlayer, this.wheat);
          foundAny = true;
        } else if (word === "wool" || word === "sheep") {
          this.transferResource(targetPlayer, stealingPlayer, this.sheep);
          foundAny = true;
        } else if (word === "lumber" || word === "wood") {
          this.transferResource(targetPlayer, stealingPlayer, this.wood);
          foundAny = true;
        }
      }
    }

    // Log the event with resource if found
    if (foundAny) {
      this.addEventLog(
        `${stealingPlayer} stole from ${targetPlayer} (${
          splitText.slice(2, -2).join(" ") || "resource identified"
        })`
      );
    } else {
      // If we can't identify the resource, treat it as an unknown steal
      this.addEventLog(
        `[DEBUG] Known steal but no resource identified - treating as unknown`
      );
      return;
    }
  }

  // Parse stole unknown message (their logic - handles all ambiguous steals)
  parseStoleUnknownMessage(pElement, prevElement) {
    if (!prevElement) {
      return;
    }
    var messageT = pElement.textContent;

    // Check if it's any kind of steal message
    if (!messageT.includes("stole") || this.isMonopoly(messageT)) {
      return;
    }

    // If it's a known steal with resource info, skip it (handled by parseStoleFromYouMessage)
    if (this.isKnownStealWithResource(messageT)) {
      return;
    }

    // Extract player names from the steal message
    var involvedPlayers = messageT.split(" ");
    var stealingPlayer = involvedPlayers[0];
    var targetPlayer = involvedPlayers.slice(-1)[0];

    // Resolve "You"/"you" to actual usernames
    stealingPlayer = this.resolvePlayerName(stealingPlayer);
    targetPlayer = this.resolvePlayerName(targetPlayer);

    if (
      !this.playerResources[stealingPlayer] ||
      !this.playerResources[targetPlayer]
    ) {
      console.log(
        "Failed to parse players...",
        stealingPlayer,
        targetPlayer,
        this.playerResources
      );
      this.addEventLog(
        `[DEBUG] Failed to parse players for unknown steal: ${stealingPlayer}, ${targetPlayer}`
      );
      return;
    }

    // --- 1v1 direct resolution logic ---
    if (this.players.length === 2) {
      // Check for resource image in the log
      var images = Array.from(pElement.getElementsByTagName("img"));
      let foundAny = false;
      for (var img of images) {
        let resourceKey = null;
        if (img.alt === "wool" || img.alt === "sheep") resourceKey = this.sheep;
        else if (img.alt === "lumber" || img.alt === "wood")
          resourceKey = this.wood;
        else if (img.alt === "brick") resourceKey = this.brick;
        else if (img.alt === "ore") resourceKey = this.stone;
        else if (img.alt === "grain" || img.alt === "wheat")
          resourceKey = this.wheat;
        if (resourceKey) {
          this.transferResource(targetPlayer, stealingPlayer, resourceKey);
          foundAny = true;
          this.addEventLog(
            `[DEBUG] 1v1 direct steal: ${stealingPlayer} stole ${resourceKey} from ${targetPlayer}`
          );
        }
      }
      if (foundAny) {
        return; // Do not use delta system if resolved
      }
    }
    // --- end 1v1 direct resolution logic ---

    // Debug logging
    this.addEventLog(
      `[DEBUG] Processing unknown steal: ${stealingPlayer} stole from ${targetPlayer}`
    );

    var stealingPlayerIndex = this.players.indexOf(stealingPlayer);
    var targetPlayerIndex = this.players.indexOf(targetPlayer);

    // Generate potential deltas for all possible resources
    var potential_deltas = [];
    for (const index of this.resourceTypes.keys()) {
      var temp = this.deep_copy_2d_array(this.zero_deltas);
      temp[stealingPlayerIndex][index] = 1;
      temp[targetPlayerIndex][index] = -1;
      potential_deltas.push(temp);
    }

    // Accumulate with existing potential deltas
    this.potential_state_deltas = (
      this.potential_state_deltas.length === 0
        ? [this.deep_copy_2d_array(this.zero_deltas)]
        : this.potential_state_deltas
    ).flatMap((potential_accumulated_delta) =>
      potential_deltas.map((potential_delta) =>
        this.add_array_of_arrays(potential_delta, potential_accumulated_delta)
      )
    );

    this.addEventLog(
      `[DEBUG] Added potential deltas for unknown steal. Total deltas: ${this.potential_state_deltas.length}`
    );
  }

  // Get current player name (simplified)
  getCurrentPlayerName() {
    // Try to find current player from existing players
    return Object.keys(this.playerResources)[0] || "Unknown";
  }

  // Parse starting resources (restored old logic)
  parseStartingResources(pElement) {
    var textContent = pElement.textContent;
    if (!textContent.includes("received starting resources")) {
      return;
    }
    var player = textContent
      .replace("received starting resources", "")
      .trim()
      .split(" ")[0];
    if (!this.playerResources[player]) {
      this.playerResources[player] = {
        [this.wood]: 0,
        [this.stone]: 0,
        [this.wheat]: 0,
        [this.brick]: 0,
        [this.sheep]: 0,
      };
    }
    // Try to increment resources from images (old logic)
    var images = Array.from(pElement.getElementsByTagName("img"));
    let foundAny = false;
    for (var img of images) {
      if (img.src.includes("card_wool")) {
        this.playerResources[player][this.sheep] += 1;
        foundAny = true;
      } else if (img.src.includes("card_lumber")) {
        this.playerResources[player][this.wood] += 1;
        foundAny = true;
      } else if (img.src.includes("card_brick")) {
        this.playerResources[player][this.brick] += 1;
        foundAny = true;
      } else if (img.src.includes("card_ore")) {
        this.playerResources[player][this.stone] += 1;
        foundAny = true;
      } else if (img.src.includes("card_grain")) {
        this.playerResources[player][this.wheat] += 1;
        foundAny = true;
      }
    }
    if (foundAny) {
      this.addEventLog(
        `${player} received starting resources (parsed from images)`
      );
    } else {
      this.addEventLog(
        `${player} received starting resources (details not available)`
      );
    }
  }

  // Parse a chat log entry (main entry point)
  parseLogEntry(entry) {
    try {
      // Player name
      const nameSpan = entry.querySelector('span[style*="font-weight:600"]');
      if (!nameSpan) return false;
      const playerName = nameSpan.textContent.trim();
      if (!playerName) return false;

      // Ensure player in map
      if (!this.playerResources[playerName]) {
        this.playerResources[playerName] = {
          [this.wood]: 0,
          [this.stone]: 0,
          [this.wheat]: 0,
          [this.brick]: 0,
          [this.sheep]: 0,
        };
        this.players.push(playerName);
        // Check if this matches a pending username
        this.checkPendingUsernameActivation();
      }

      // Parse using their logic
      this.parseStartingResources(entry);
      this.parseGotMessage(entry);
      this.parseBuiltMessage(entry);
      this.parseBoughtMessage(entry);
      this.parseTradeBankMessage(entry);
      this.parseYearOfPleantyMessage(entry);
      this.parseStoleAllOfMessage(entry);
      this.parseDiscardedMessage(entry);

      // Review thefts after each parse
      this.reviewThefts();

      return true;
    } catch (error) {
      console.error("[Catan Card Tracker] Error parsing log entry:", error);
      return false;
    }
  }

  // Parse with previous element for trade/steal detection
  parseLogEntryWithPrev(entry, prevEntry) {
    try {
      // First do normal parsing
      const result = this.parseLogEntry(entry);

      // Then do parsing that needs previous element
      if (prevEntry) {
        this.parseTradedMessage(entry, prevEntry);
        this.parseStoleFromYouMessage(entry, prevEntry);
        this.parseStoleUnknownMessage(entry, prevEntry);
        this.reviewThefts();
      }

      return result;
    } catch (error) {
      console.error(
        "[Catan Card Tracker] Error parsing log entry with prev:",
        error
      );
      return false;
    }
  }

  // Get current player resources
  getPlayerResources() {
    return this.playerResources;
  }

  // Reset all resources
  resetResources() {
    this.playerResources = {};
    this.eventLogs = [];
    this.players = [];
    this.player_colors = {};
    this.potential_state_deltas = [];
  }

  // Get resource types
  getResourceTypes() {
    return this.RESOURCE_TYPES;
  }

  // Add event to log
  addEventLog(message) {
    this.eventLogs.push({
      message,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 100 events
    if (this.eventLogs.length > 100) {
      this.eventLogs = this.eventLogs.slice(-100);
    }
  }

  // Get event logs
  getEventLogs() {
    return this.eventLogs;
  }

  // Get potential theft deltas for debugging
  getPotentialTheftDeltas() {
    return this.potential_state_deltas;
  }

  // Get theft information for a specific player and resource
  getTheftForPlayerAndResource(player, resourceType) {
    const playerIndex = this.players.indexOf(player);
    const resourceIndex = this.resourceTypes.indexOf(resourceType);
    if (playerIndex === -1 || resourceIndex === -1) return [];

    const result = new Set();
    for (var potential_state_delta of this.potential_state_deltas) {
      var diff = potential_state_delta[playerIndex][resourceIndex];
      if (diff !== 0) {
        result.add(diff);
      }
    }
    return Array.from(result);
  }

  // Get theft information for a specific player
  getTheftForPlayer(player) {
    if (this.potential_state_deltas.length === 0) {
      return [[0], [0]];
    }
    const playerIndex = this.players.indexOf(player);
    if (playerIndex === -1) return [[0], [0]];

    const theftsBy = this.potential_state_deltas.map((potential_state_delta) =>
      potential_state_delta[playerIndex]
        .filter((x) => x > 0)
        .reduce((a, b) => a + b, 0)
    );
    const theftsFrom = this.potential_state_deltas.map(
      (potential_state_delta) =>
        potential_state_delta[playerIndex]
          .filter((x) => x < 0)
          .reduce((a, b) => a + b, 0)
    );

    return [Array.from(new Set(theftsBy)), Array.from(new Set(theftsFrom))];
  }
}

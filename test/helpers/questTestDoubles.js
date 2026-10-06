export class ScriptedQuestRandom {
  constructor(script = {}) {
    this.ints = [...(script.ints ?? [])];
    this.bools = [...(script.bools ?? [])];
    this.picks = [...(script.picks ?? [])];
  }

  nextInt(min, max) {
    return this.ints.length > 0 ? this.ints.shift() : min;
  }

  nextBool(chance) {
    return this.bools.length > 0 ? this.bools.shift() : chance >= 1;
  }

  pick(items) {
    const choice = this.picks.shift();
    if (choice === undefined) {
      return items[0];
    }
    return items.find(item => this.matches(item, choice)) ?? items[0];
  }

  matches(item, choice) {
    if (Array.isArray(choice) && Array.isArray(item)) {
      return item.join('|') === choice.join('|');
    }
    if (item === choice) {
      return true;
    }
    if (Array.isArray(item)) {
      return item.includes(choice);
    }
    if (typeof item === 'object' && item !== null) {
      return Object.values(item).some(value => this.matches(value, choice));
    }
    return false;
  }
}

export class FakeQuestPackService {
  constructor(names) {
    this.names = names;
    this.calls = [];
  }

  async generateName(domain, maxWords) {
    const values = this.names[domain];
    const next = values.shift() ?? `${domain}-fallback`;
    this.calls.push({ domain, maxWords });
    return { text: next, domain, sourceTypes: ['local-pattern'] };
  }
}

export function createFetchStub(routes) {
  return async (input) => {
    const match = Object.entries(routes).find(([key]) => String(input).includes(key));
    if (!match) {
      throw new Error(`Unexpected URL: ${input}`);
    }
    const payload = match[1];
    if (payload instanceof Error) {
      throw payload;
    }
    return {
      async text() {
        return typeof payload === 'string' ? payload : JSON.stringify(payload);
      },
      async json() {
        return payload;
      },
    };
  };
}

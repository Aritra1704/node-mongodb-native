'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const core = require('mongodb-core');
const Server = core.Server;
const ReplSet = core.ReplSet;
const Mongos = core.Mongos;
const ServerSessionPool = core.Sessions.ServerSessionPool;

(() => {
  const sandbox = sinon.createSandbox();

  beforeEach('Session Leak Before Each - setup session tracking', function() {
    sandbox.spy(Server.prototype, 'endSessions');
    sandbox.spy(ReplSet.prototype, 'endSessions');
    sandbox.spy(Mongos.prototype, 'endSessions');
    sandbox.spy(ServerSessionPool.prototype, 'acquire');
  });

  afterEach('Session Leak After Each - ensure no leaks', function() {
    const poolCalls = ServerSessionPool.prototype.acquire.getCalls();
    const endCalls = Server.prototype.endSessions
      .getCalls()
      .concat(ReplSet.prototype.endSessions.getCalls())
      .concat(Mongos.prototype.endSessions.getCalls());

    const sessions = new Set();
    poolCalls.forEach(call => sessions.add(call.returnValue.id));
    // const totalSessionCount = set.size;

    endCalls.forEach(call => {
      const arg = call.args[0];
      const ids = Array.isArray(arg) ? arg : [arg];

      ids.forEach(id => sessions.delete(id));
    });

    const leakedSessionCount = sessions.size;
    try {
      expect(
        leakedSessionCount,
        `test is leaking ${leakedSessionCount} sessions, when it should be leaking 0`
      ).to.equal(0);
    } catch (e) {
      this.test.error(e);
    }
  });

  afterEach('Session Leak After Each - restore sandbox', () => sandbox.restore());
})();

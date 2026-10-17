using NUnit.Framework;
using Rgfn.Core.Combat;

namespace Rgfn.Core.Tests.Combat;

[TestFixture]
public sealed class TurnManagerTests
{
    // TURN-001: initialization case from test/systems/turnManager.test.js.
    [Test]
    public void InitializeTurns_WithLivingPlayerAndDeadEnemy_StartsWithPlayer()
    {
        var manager = new TurnManager();
        var player = new TurnParticipant(1, IsActive: true, IsDead: false);
        var deadEnemy = new TurnParticipant(2, IsActive: true, IsDead: true);

        manager.InitializeTurns([player, deadEnemy], player.Id);

        Assert.That(manager.CurrentParticipant, Is.SameAs(player));
        Assert.That(manager.IsPlayerTurn, Is.True);
    }
}

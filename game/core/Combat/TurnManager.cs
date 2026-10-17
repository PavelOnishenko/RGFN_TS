namespace Rgfn.Core.Combat;

public sealed record TurnParticipant(int Id, bool IsActive, bool IsDead);

public sealed class TurnManager
{
    private TurnParticipant[] _participants = [];
    private int? _playerId;

    public TurnParticipant? CurrentParticipant => _participants.FirstOrDefault();

    public bool IsPlayerTurn =>
        CurrentParticipant is { } participant && participant.Id == _playerId;

    public void InitializeTurns(IEnumerable<TurnParticipant> participants, int playerId)
    {
        _participants = participants
            .Where(participant => participant.IsActive && !participant.IsDead)
            .ToArray();
        _playerId = playerId;
    }
}

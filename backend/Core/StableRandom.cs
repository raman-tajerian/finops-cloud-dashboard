namespace Core;

public class StableRandom
{
    private uint _seed;

    public StableRandom(uint seed)
    {
        _seed = seed;
    }

    public int Next(int minValue, int maxValue)
    {
        // Simple LCG (Linear Congruential Generator) for cross-platform deterministic numbers
        _seed = _seed * 1103515245 + 12345;
        uint val = _seed % 2147483648;
        long range = (long)maxValue - minValue;
        return minValue + (int)(val % range);
    }

    public double NextDouble()
    {
        _seed = _seed * 1103515245 + 12345;
        return (double)(_seed % 1000000) / 1000000.0;
    }
}

using Microsoft.Extensions.Options;

namespace Cowork.Api.Infrastructure;

/// <summary>Settings that describe the space itself. Validated at startup; read nowhere else.</summary>
public sealed class SpaceOptions
{
    public const string SectionName = "Space";

    /// <summary>The IANA time zone the space operates in. Day and evening rules are its rules.</summary>
    public string TimeZoneId { get; set; } = string.Empty;

    /// <summary>The hour (in the space's time zone) at which evening-before reminders go out.</summary>
    public int ReminderEveningHour { get; set; }
}

public sealed class DevUserOptions
{
    public const string SectionName = "DevUsers";

    /// <summary>Known dev personas by the key the X-Dev-User header carries.</summary>
    public Dictionary<string, DevUser> Users { get; set; } = [];
}

public sealed record DevUser
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string Role { get; set; } = string.Empty;
}

public sealed class OptionsValidator
    : IValidateOptions<SpaceOptions>,
        IValidateOptions<DevUserOptions>
{
    public ValidateOptionsResult Validate(string? name, SpaceOptions options)
    {
        if (string.IsNullOrWhiteSpace(options.TimeZoneId))
        {
            return ValidateOptionsResult.Fail("Space:TimeZoneId is required.");
        }

        try
        {
            TimeZoneInfo.FindSystemTimeZoneById(options.TimeZoneId);
        }
        catch (TimeZoneNotFoundException exception)
        {
            return ValidateOptionsResult.Fail(
                $"Space:TimeZoneId is not a known time zone: {exception.Message}"
            );
        }

        return options.ReminderEveningHour is < 0 or > 23
            ? ValidateOptionsResult.Fail("Space:ReminderEveningHour must be between 0 and 23.")
            : ValidateOptionsResult.Success;
    }

    public ValidateOptionsResult Validate(string? name, DevUserOptions options)
    {
        if (options.Users.Count == 0)
        {
            return ValidateOptionsResult.Fail("At least one dev user must be configured.");
        }

        var failures = new List<string>();
        foreach (var (key, user) in options.Users)
        {
            if (string.IsNullOrWhiteSpace(user.Name) || string.IsNullOrWhiteSpace(user.Email))
            {
                failures.Add($"Dev user '{key}' needs a name and an email.");
            }

            if (user.Role is not ("Staff" or "Member"))
            {
                failures.Add(
                    $"Dev user '{key}' has role '{user.Role}'; expected 'Staff' or 'Member'."
                );
            }
        }

        return failures.Count > 0
            ? ValidateOptionsResult.Fail(failures)
            : ValidateOptionsResult.Success;
    }
}

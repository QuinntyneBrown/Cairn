using System.CommandLine;
using Cairn.Application.Abstractions;
using Cairn.Cli.Infrastructure;
using Cairn.Domain;
using Microsoft.EntityFrameworkCore;

namespace Cairn.Cli.Commands;

public static class LeadCreateCommand
{
    public static Command Create(IServiceProvider services)
    {
        var nameOption = new Option<string>("--name", "-n")
        {
            Description = "The lead's display name",
            Required = true
        };

        var emailOption = new Option<string>("--email", "-e")
        {
            Description = "The lead's email address",
            Required = true
        };

        var adminOption = new Option<bool>("--admin")
        {
            Description = "Create an admin instead of a lead"
        };

        var passwordOption = new Option<string?>("--password")
        {
            Description = "Give this person a password so they can sign in. Leads do not need one."
        };

        var command = new Command("create", "Add a team lead");
        command.Add(nameOption);
        command.Add(emailOption);
        command.Add(adminOption);
        command.Add(passwordOption);

        command.SetAction(async (parseResult, cancellationToken) =>
        {
            await using var scope = CliScope.Create(services);

            var email = parseResult.GetValue(emailOption)!.Trim().ToLowerInvariant();
            var password = parseResult.GetValue(passwordOption);
            var isAdmin = parseResult.GetValue(adminOption);

            if (await scope.Db.Users.AnyAsync(u => u.Email == email, cancellationToken))
            {
                scope.Console.Error($"{email} already exists.");
                return 1;
            }

            if (isAdmin && string.IsNullOrWhiteSpace(password))
            {
                scope.Console.Error("An admin needs --password; there would be no way to sign in otherwise.");
                return 1;
            }

            scope.Db.Users.Add(new User
            {
                Id = Guid.NewGuid(),
                Email = email,
                DisplayName = parseResult.GetValue(nameOption)!.Trim(),
                // Leads legitimately have no password: they vote through a link and never sign in.
                PasswordHash = string.IsNullOrWhiteSpace(password) ? string.Empty : scope.Hasher.Hash(password),
                Role = isAdmin ? Roles.Admin : Roles.Lead,
                CreatedAt = scope.Clock.UtcNow
            });

            await scope.Db.SaveChangesAsync(cancellationToken);
            scope.Console.Success($"Created {(isAdmin ? "admin" : "lead")} {email}.");
            return 0;
        });

        return command;
    }
}

using DisasterPreparedness_ResponseSystem.Core.DTOs;
using FluentValidation;

namespace DisasterPreparedness_ResponseSystem.Validators
{
    public class RegisterDtoValidator : AbstractValidator<RegisterDto>
    {
        public RegisterDtoValidator()
        {
            RuleFor(x => x.FullName)
                .NotEmpty().WithMessage("Full name is required.")
                .MinimumLength(3).WithMessage("Full name must be at least 3 characters.")
                .MaximumLength(100).WithMessage("Full name cannot exceed 100 characters.");

            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email address is required.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.")
                .MinimumLength(6).WithMessage("Password must be at least 6 characters.")
                .Matches(@"[A-Z]").WithMessage("Password must contain at least one uppercase letter.")
                .Matches(@"[0-9]").WithMessage("Password must contain at least one number.")
                .Matches(@"[^a-zA-Z0-9]").WithMessage("Password must contain at least one special character.");

            RuleFor(x => x.PhoneNumber)
    .NotEmpty().WithMessage("Phone number is required.")
    .Matches(@"^03\d{9}$").WithMessage("Enter a valid Pakistani mobile number (e.g. 03001234567).");

            RuleFor(x => x.Role)
                .NotEmpty().WithMessage("Role is required.")
                .Must(r => new[] { "Admin", "Responder", "Citizen" }.Contains(r))
                .WithMessage("Role must be Admin, Responder, or Citizen.");

            // ResponderOrganizationId required only when role is Responder
            RuleFor(x => x.ResponderOrganizationId)
                .NotNull().WithMessage("Responder must belong to an organization.")
                .When(x => x.Role == "Responder");
        }
    }

    public class LoginDtoValidator : AbstractValidator<LoginDto>
    {
        public LoginDtoValidator()
        {
            RuleFor(x => x.Email)
                .NotEmpty().WithMessage("Email is required.")
                .EmailAddress().WithMessage("A valid email address is required.");

            RuleFor(x => x.Password)
                .NotEmpty().WithMessage("Password is required.");
        }
    }
}

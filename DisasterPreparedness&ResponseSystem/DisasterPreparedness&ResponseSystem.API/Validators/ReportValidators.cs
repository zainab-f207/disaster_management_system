using DisasterPreparedness_ResponseSystem.Core.DTOs;
using FluentValidation;

namespace DisasterPreparedness_ResponseSystem.Validators
{
    public class CreateReportDtoValidator : AbstractValidator<CreateReportDto>
    {
        public CreateReportDtoValidator()
        {
            RuleFor(x => x.Description)
                .NotEmpty().WithMessage("Please describe what you are seeing.")
                .MinimumLength(10).WithMessage("Description must be at least 10 characters.")
                .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");

            RuleFor(x => x.Latitude)
                .InclusiveBetween(23.0, 37.0)
                .WithMessage("Location must be within Pakistan (latitude 23–37).");

            RuleFor(x => x.Longitude)
                .InclusiveBetween(60.0, 77.0)
                .WithMessage("Location must be within Pakistan (longitude 60–77).");

            RuleFor(x => x.ImageUrl)
                .Must(url => url == null || Uri.TryCreate(url, UriKind.Absolute, out _))
                .WithMessage("Image URL must be a valid URL if provided.");
        }
    }

    public class CreateDisasterFromReportDtoValidator : AbstractValidator<CreateDisasterFromReportDto>
    {
        public CreateDisasterFromReportDtoValidator()
        {
            RuleFor(x => x.AffectedAreaRadiusKm)
                .InclusiveBetween(0.1, 500.0)
                .WithMessage("Affected radius must be between 0.1 and 500 km.")
                .When(x => x.AffectedAreaRadiusKm.HasValue);
        }
    }
}

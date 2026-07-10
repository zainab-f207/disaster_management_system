using DisasterPreparedness_ResponseSystem.Core.DTOs;
using FluentValidation;

namespace DisasterPreparedness_ResponseSystem.Validators
{
    public class CreateDisasterDtoValidator : AbstractValidator<CreateDisasterDto>
    {
        public CreateDisasterDtoValidator()
        {
            RuleFor(x => x.Description)
                .NotEmpty().WithMessage("Description is required.")
                .MinimumLength(10).WithMessage("Description must be at least 10 characters.")
                .MaximumLength(1000).WithMessage("Description cannot exceed 1000 characters.");

            RuleFor(x => x.Latitude)
                .NotEmpty().WithMessage("Latitude is required.")
                .InclusiveBetween(23.0, 37.0)
                .WithMessage("Latitude must be within Pakistan's geographic range (23 to 37).");

            // Pakistan longitude range: 60°E to 77°E
            RuleFor(x => x.Longitude)
                .NotEmpty().WithMessage("Longitude is required.")
                .InclusiveBetween(60.0, 77.0)
                .WithMessage("Longitude must be within Pakistan's geographic range (60 to 77).");

            RuleFor(x => x.AffectedAreaRadiusKm)
                .InclusiveBetween(0.1, 500.0)
                .WithMessage("Affected area radius must be between 0.1 and 500 km.")
                .When(x => x.AffectedAreaRadiusKm.HasValue);
        }
    }
}

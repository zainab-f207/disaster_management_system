using DisasterPreparedness_ResponseSystem.Core.DTOs;
using FluentValidation;

namespace DisasterPreparedness_ResponseSystem.Validators
{
    public class CreateOrganizationDtoValidator : AbstractValidator<CreateOrganizationDto>
    {
        public CreateOrganizationDtoValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().WithMessage("Organization name is required.")
                .MaximumLength(200).WithMessage("Name cannot exceed 200 characters.");

            RuleFor(x => x.ContactNumber)
                .NotEmpty().WithMessage("Contact number is required.")
                .Matches(@"^[0-9\-\+\s]+$").WithMessage("Contact number can only contain digits, +, - and spaces.");

            RuleFor(x => x.BaseLatitude)
                .InclusiveBetween(23.0, 37.0)
                .WithMessage("Organization must be located within Pakistan (latitude 23–37).");

            RuleFor(x => x.BaseLongitude)
                .InclusiveBetween(60.0, 77.0)
                .WithMessage("Organization must be located within Pakistan (longitude 60–77).");
        }
    }
}

using DisasterPreparedness_ResponseSystem.Core.DTOs;
using FluentValidation;

namespace DisasterPreparedness_ResponseSystem.Validators
{
    public class CreateAdminDisasterDtoValidator : AbstractValidator<CreateAdminDisasterDto>
    {
        public CreateAdminDisasterDtoValidator()
        {
            RuleFor(x => x.Source).NotEmpty().WithMessage("A verification source is required.");
        }
    }
}

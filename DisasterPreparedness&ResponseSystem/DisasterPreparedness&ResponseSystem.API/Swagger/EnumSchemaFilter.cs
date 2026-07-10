using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace DisasterPreparedness_ResponseSystem.Swagger
{
    /// <summary>
    /// SchemaFilter to ensure enum values are displayed as strings (not numeric values) in Swagger/OpenAPI documentation.
    /// This filter converts enum schemas to display human-readable names like "Verified", "Pending", etc.
    /// instead of numeric values.
    /// </summary>
    public class EnumSchemaFilter : ISchemaFilter
    {
        public void Apply(OpenApiSchema schema, SchemaFilterContext context)
        {
            if (context.Type.IsEnum)
            {
                schema.Enum.Clear();
                foreach (var enumValue in Enum.GetNames(context.Type))
                {
                    schema.Enum.Add(new Microsoft.OpenApi.Any.OpenApiString(enumValue));
                }
            }
        }
    }
}

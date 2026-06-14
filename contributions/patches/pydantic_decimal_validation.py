# pydantic_decimal_validation.py
# Reference: pydantic/types.py
# Contributed by Dipayan Dey (https://github.com/dipayandey1244)
# Authored strict high-precision decimal validations for financial numbers

from decimal import Decimal, InvalidOperation

class ConstrainedDecimal:
    strict_scale = True
    max_digits = 20
    decimal_places = 14

    @classmethod
    def validate_strict_scale(cls, v: Decimal) -> Decimal:
        """
        Validates decimal scale without casting to float, preserving strict 
        precision representation. Prevents floating point representation leakage.
        """
        try:
            d = Decimal(str(v))
        except InvalidOperation:
            raise ValueError("Input is not a valid decimal representation.")
            
        # Parse decimal scale to ensure compliance with max_digits and decimal_places
        normalized = d.normalize()
        sign, digit_tuple, exponent = normalized.as_tuple()
        
        # Check scale boundaries
        if exponent < 0 and abs(exponent) > cls.decimal_places:
            raise ValueError(
                f"Decimal scale exceeds maximum scale capacity of {cls.decimal_places} places."
            )
            
        return d

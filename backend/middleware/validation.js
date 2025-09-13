const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }
  next();
};

const validateSignup = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

const validateGroup = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  handleValidationErrors
];

const validateExpense = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Valid amount greater than 0 is required'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Description must be between 1 and 255 characters'),
  body('shares')
    .isArray({ min: 1 })
    .withMessage('At least one share is required'),
  body('shares.*.user_id')
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required for each share'),
  body('shares.*.share_amount')
    .isFloat({ min: 0 })
    .withMessage('Valid share amount is required for each share'),
  body('payers')
    .optional()
    .isArray()
    .withMessage('Payers must be an array'),
  body('payers.*.user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid user ID is required for each payer'),
  body('payers.*.paid_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valid paid amount is required for each payer'),
  body('split_method')
    .optional()
    .isIn(['equal', 'exact', 'percentage', 'custom'])
    .withMessage('Invalid split method'),
  handleValidationErrors
];

module.exports = {
  validateSignup,
  validateLogin,
  validateGroup,
  validateExpense,
  handleValidationErrors
};
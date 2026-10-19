package usecase

import (
	"context"

	domErr "octo-tap-backend/internal/domain/errors"
	domainRepo "octo-tap-backend/internal/domain/repository"
	"octo-tap-backend/internal/infrastructure/security"
)

type AuthUseCase struct {
	adminRepo domainRepo.AdminRepository
	hasher    security.PasswordHasher
	jwt       security.TokenProvider
}

func NewAuthUseCase(
	adminRepo domainRepo.AdminRepository,
	hasher security.PasswordHasher,
	jwt security.TokenProvider,
) *AuthUseCase {
	return &AuthUseCase{
		adminRepo: adminRepo,
		hasher:    hasher,
		jwt:       jwt,
	}
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginOutput struct {
	Token     string `json:"token"`
	AdminUser struct {
		ID       string `json:"id"`
		Email    string `json:"email"`
		FullName string `json:"full_name"`
		Role     string `json:"role"`
		Status   string `json:"status"`
	} `json:"admin_user"`
}

func (uc *AuthUseCase) Login(ctx context.Context, input LoginInput) (*LoginOutput, error) {
	admin, err := uc.adminRepo.GetByEmail(ctx, input.Email)
	if err != nil {
		return nil, domErr.ErrInvalidCredentials
	}

	if !admin.IsActive() {
		return nil, domErr.ErrAdminInactive
	}

	if !uc.hasher.Compare(admin.PasswordHash, input.Password) {
		return nil, domErr.ErrInvalidCredentials
	}

	token, err := uc.jwt.Generate(admin)
	if err != nil {
		return nil, err
	}

	out := &LoginOutput{
		Token: token,
	}
	out.AdminUser.ID = admin.ID.String()
	out.AdminUser.Email = admin.Email
	out.AdminUser.FullName = admin.FullName
	out.AdminUser.Role = admin.Role
	out.AdminUser.Status = admin.Status

	return out, nil
}

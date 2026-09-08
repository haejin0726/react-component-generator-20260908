import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptInput } from './PromptInput';

describe('PromptInput', () => {
  it('프롬프트가 비어 있으면 생성 버튼이 비활성이다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} history={[]} />);
    expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
  });

  it('입력하면 버튼이 활성화되고 클릭 시 입력값으로 onGenerate가 호출된다', async () => {
    const onGenerate = vi.fn();
    const user = userEvent.setup();
    render(<PromptInput onGenerate={onGenerate} isLoading={false} history={[]} />);

    await user.type(screen.getByRole('textbox'), '프로필 카드');
    const submit = screen.getByRole('button', { name: '컴포넌트 생성' });
    expect(submit).toBeEnabled();

    await user.click(submit);
    expect(onGenerate).toHaveBeenCalledWith('프로필 카드');
  });

  it('로딩 중에는 생성 버튼이 비활성이고 "생성 중..." 을 보여준다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={true} history={[]} />);
    expect(screen.getByRole('button', { name: '생성 중...' })).toBeDisabled();
  });

  it('500자를 초과하면 에러 메시지가 표시되고 생성 버튼이 비활성화된다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} history={[]} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'a'.repeat(501) },
    });

    expect(
      screen.getByText('프롬프트는 최대 500자까지 입력할 수 있습니다.')
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '컴포넌트 생성' })).toBeDisabled();
  });

  it('입력한 글자 수와 최대 글자 수를 카운터로 보여준다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} history={[]} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '프로필 카드' },
    });

    expect(screen.getByText('6 / 500')).toBeInTheDocument();
  });

  it('500자를 초과하면 카운터가 초과 상태 스타일 클래스를 갖는다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} history={[]} />);

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'a'.repeat(501) },
    });

    expect(screen.getByText('501 / 500')).toHaveClass('prompt-counter--over');
  });

  it('500자를 초과한 상태에서 제출해도 onGenerate가 호출되지 않는다', () => {
    const onGenerate = vi.fn();
    render(<PromptInput onGenerate={onGenerate} isLoading={false} history={[]} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'a'.repeat(501) } });
    fireEvent.submit(textarea.closest('form')!);

    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('history가 비어있으면 최근 프롬프트 섹션이 렌더링되지 않는다', () => {
    render(<PromptInput onGenerate={vi.fn()} isLoading={false} history={[]} />);
    expect(screen.queryByText('최근 프롬프트')).not.toBeInTheDocument();
  });

  it('history 항목이 버튼으로 렌더링된다', () => {
    render(
      <PromptInput
        onGenerate={vi.fn()}
        isLoading={false}
        history={['이전 프롬프트 A', '이전 프롬프트 B']}
      />
    );
    expect(screen.getByText('최근 프롬프트')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전 프롬프트 A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '이전 프롬프트 B' })).toBeInTheDocument();
  });

  it('history 항목을 클릭하면 textarea가 해당 텍스트로 채워진다', async () => {
    const user = userEvent.setup();
    render(
      <PromptInput onGenerate={vi.fn()} isLoading={false} history={['이전 프롬프트 A']} />
    );

    await user.click(screen.getByRole('button', { name: '이전 프롬프트 A' }));

    expect(screen.getByRole('textbox')).toHaveValue('이전 프롬프트 A');
  });
});

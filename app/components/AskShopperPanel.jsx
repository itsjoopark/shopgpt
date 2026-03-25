import {useState, useRef, useEffect, useCallback} from 'react';
import {useFetcher, Link} from 'react-router';
import {Image, Money} from '@shopify/hydrogen';

const GOAL_OPTIONS = [
  {id: 'seasonal', label: 'Seasonal refresh'},
  {id: 'event', label: 'Special event'},
  {id: 'essentials', label: 'Everyday essentials'},
  {id: 'gift', label: 'Gift shopping'},
];

const BUDGET_OPTIONS = [
  {id: 'under-50', label: 'Under $50', value: 50},
  {id: '50-100', label: '$50 - $100', value: 100},
  {id: '100-200', label: '$100 - $200', value: 200},
  {id: 'no-limit', label: 'No limit', value: null},
];

const OCCASION_OPTIONS = [
  {id: 'casual', label: 'Casual'},
  {id: 'formal', label: 'Formal'},
  {id: 'workout', label: 'Workout'},
  {id: 'outdoor', label: 'Outdoor'},
  {id: 'date-night', label: 'Date night'},
  {id: 'work', label: 'Work'},
];

const QUICK_ACTIONS = [
  {
    id: 'set-shopping-goals',
    label: 'Set my shopping goals',
    prompt: null,
  },
  {
    id: 'build-wardrobe',
    label: 'Build a wardrobe',
    prompt: 'Help me build a versatile wardrobe with essentials',
  },
  {
    id: 'shop-local',
    label: 'Shop local',
    prompt: 'Show me locally inspired or small-brand options',
  },
];

function makeWelcomeMessage() {
  return {
    type: 'assistant',
    kind: 'welcome',
    text: 'How may I help you today?',
    quickActions: QUICK_ACTIONS,
    products: null,
    query: null,
    id: 'welcome',
  };
}

function buildGoalQuery(goal, budget, occasion) {
  const goalLabel = GOAL_OPTIONS.find((g) => g.id === goal)?.label ?? goal;
  const occasionLabel =
    OCCASION_OPTIONS.find((o) => o.id === occasion)?.label ?? occasion;
  const budgetOption = BUDGET_OPTIONS.find((b) => b.id === budget);
  const budgetStr = budgetOption?.value
    ? `under $${budgetOption.value}`
    : 'any budget';

  return `I need ${goalLabel.toLowerCase()} for ${occasionLabel.toLowerCase()}, ${budgetStr}`;
}

export function AskShopperPanel() {
  const [messages, setMessages] = useState(() => [makeWelcomeMessage()]);
  const [input, setInput] = useState('');
  const [goalWizard, setGoalWizard] = useState(null);
  const fetcher = useFetcher();
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const pendingQueryRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data && pendingQueryRef.current) {
      const query = pendingQueryRef.current;
      pendingQueryRef.current = null;
      const data = fetcher.data;

      const products = data.result?.items?.products?.nodes ?? [];
      const rawSummary = data.aiSummary;

      const finalize = (summary) => {
        setMessages((prev) => [
          ...prev.filter((m) => m.type !== 'loading'),
          {
            type: 'assistant',
            text: typeof summary === 'string' ? summary : null,
            products: products.slice(0, 4),
            query,
            id: Date.now(),
          },
        ]);
        scrollToBottom();
      };

      if (rawSummary && typeof rawSummary === 'object' && typeof rawSummary.then === 'function') {
        rawSummary.then(finalize).catch(() => finalize(null));
      } else {
        finalize(rawSummary);
      }
    }
  }, [fetcher.state, fetcher.data, scrollToBottom]);

  const submitQuery = useCallback(
    (query) => {
      const trimmed = query.trim();
      if (!trimmed) return;

      pendingQueryRef.current = trimmed;
      setMessages((prev) => {
        const cleaned = prev.map((m) =>
          m.kind === 'welcome' ? {...m, quickActions: null} : m,
        );
        return [
          ...cleaned,
          {type: 'user', text: trimmed, id: Date.now()},
          {type: 'loading', id: Date.now() + 1},
        ];
      });
      setInput('');
      scrollToBottom();

      fetcher.load(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [fetcher, scrollToBottom],
  );

  function handleSubmit(e) {
    e.preventDefault();
    submitQuery(input);
  }

  function handleQuickAction(action) {
    if (action.id === 'set-shopping-goals') {
      setMessages((prev) => {
        const cleaned = prev.map((m) =>
          m.kind === 'welcome' ? {...m, quickActions: null} : m,
        );
        return [
          ...cleaned,
          {type: 'user', text: action.label, id: Date.now()},
          {
            type: 'assistant',
            text: "Let's set up your shopping plan. What are you shopping for?",
            id: Date.now() + 1,
          },
        ];
      });
      setGoalWizard({step: 'goal', goal: null, budget: null, occasion: null});
      scrollToBottom();
      return;
    }
    submitQuery(action.prompt);
  }

  function handleGoalStep(optionId) {
    if (!goalWizard) return;

    if (goalWizard.step === 'goal') {
      const label = GOAL_OPTIONS.find((g) => g.id === optionId)?.label;
      setMessages((prev) => [
        ...prev,
        {type: 'user', text: label, id: Date.now()},
        {
          type: 'assistant',
          text: "What's your budget?",
          id: Date.now() + 1,
        },
      ]);
      setGoalWizard({...goalWizard, step: 'budget', goal: optionId});
      scrollToBottom();
    } else if (goalWizard.step === 'budget') {
      const label = BUDGET_OPTIONS.find((b) => b.id === optionId)?.label;
      setMessages((prev) => [
        ...prev,
        {type: 'user', text: label, id: Date.now()},
        {
          type: 'assistant',
          text: "What's the occasion?",
          id: Date.now() + 1,
        },
      ]);
      setGoalWizard({...goalWizard, step: 'occasion', budget: optionId});
      scrollToBottom();
    } else if (goalWizard.step === 'occasion') {
      const label = OCCASION_OPTIONS.find((o) => o.id === optionId)?.label;
      setMessages((prev) => [
        ...prev,
        {type: 'user', text: label, id: Date.now()},
      ]);
      const query = buildGoalQuery(
        goalWizard.goal,
        goalWizard.budget,
        optionId,
      );
      setGoalWizard(null);
      submitQuery(query);
    }
  }

  const wizardOptions =
    goalWizard?.step === 'goal'
      ? GOAL_OPTIONS
      : goalWizard?.step === 'budget'
        ? BUDGET_OPTIONS
        : goalWizard?.step === 'occasion'
          ? OCCASION_OPTIONS
          : null;

  return (
    <div className="ask-shopper-panel" id="ask-shopper-panel">
      <div className="ask-shopper-messages" ref={listRef}>
        {messages.map((msg) => {
          if (msg.type === 'user') {
            return (
              <div key={msg.id} className="shopper-msg shopper-msg-user">
                <p>{msg.text}</p>
              </div>
            );
          }
          if (msg.type === 'loading') {
            return <LoadingBubble key={msg.id} />;
          }
          return (
            <AssistantMessage
              key={msg.id}
              text={msg.text}
              products={msg.products}
              query={msg.query}
              quickActions={msg.quickActions}
              onQuickAction={handleQuickAction}
            />
          );
        })}

        {wizardOptions && (
          <div className="goal-wizard-options">
            {wizardOptions.map((opt) => (
              <button
                key={opt.id}
                className="goal-wizard-chip"
                type="button"
                onClick={() => handleGoalStep(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <form className="ask-shopper-composer" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask follow up"
          autoComplete="off"
        />
        <button
          type="submit"
          className="ask-shopper-send"
          aria-label="Send"
          disabled={!input.trim()}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </form>
    </div>
  );
}

function LoadingBubble() {
  return (
    <div className="shopper-msg shopper-msg-assistant">
      <div className="shopper-loading-dots">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function AssistantMessage({text, products, query, quickActions, onQuickAction}) {
  const hasProducts = products && products.length > 0;

  return (
    <div className="shopper-msg shopper-msg-assistant">
      {text && <p className="shopper-assistant-text">{text}</p>}
      {!text && hasProducts && (
        <p className="shopper-assistant-text">
          Here are some results I found:
        </p>
      )}
      {!text && !hasProducts && !quickActions && (
        <p className="shopper-assistant-text">
          I couldn&apos;t find anything for that query. Try rephrasing your
          question.
        </p>
      )}

      {quickActions && quickActions.length > 0 && (
        <div className="shopper-quick-actions">
          {quickActions.map((action) => (
            <button
              key={action.id}
              className="shopper-quick-chip"
              type="button"
              onClick={() => onQuickAction(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {hasProducts && (
        <div className="shopper-product-cards">
          {products.map((product) => (
            <ShopperProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
      {hasProducts && query && (
        <Link
          to={`/search?q=${encodeURIComponent(query)}`}
          className="shopper-view-all"
        >
          View all results &rarr;
        </Link>
      )}
    </div>
  );
}

function ShopperProductCard({product}) {
  const image =
    product.selectedOrFirstAvailableVariant?.image ?? product.featuredImage;
  const price =
    product.selectedOrFirstAvailableVariant?.price ??
    product.priceRange?.minVariantPrice;

  return (
    <Link to={`/products/${product.handle}`} className="shopper-product-card">
      {image && (
        <Image data={image} width={56} height={56} alt={product.title} />
      )}
      <div className="shopper-product-info">
        <span className="shopper-product-title">{product.title}</span>
        {price && (
          <span className="shopper-product-price">
            <Money data={price} />
          </span>
        )}
      </div>
    </Link>
  );
}

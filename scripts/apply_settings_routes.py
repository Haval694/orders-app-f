from pathlib import Path

base = Path('/home/ubuntu/orderakan')
layout = base / 'app/(tabs)/_layout.tsx'
s = layout.read_text()
needle = '''      <Tabs.Screen
        name="months"
        options={{
          title: "مانگەکان",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="calendar" color={color} />,
        }}
      />'''
replacement = needle + '''
      <Tabs.Screen
        name="settings"
        options={{
          title: "ڕێکخستن",
          tabBarIcon: ({ color }) => <IconSymbol size={24} name="settings" color={color} />,
        }}
      />'''
if needle not in s: raise SystemExit('tabs anchor not found')
layout.write_text(s.replace(needle, replacement))

icons = base / 'components/ui/icon-symbol.tsx'
s = icons.read_text()
if '"settings": "settings"' not in s:
    s = s.replace('  "calendar": "calendar-month",\n', '  "calendar": "calendar-month",\n  "settings": "settings",\n')
icons.write_text(s)

orders = base / 'app/(tabs)/orders.tsx'
s = orders.read_text()
s = s.replace('import { ORDER_STATUSES, Order, OrderStatus, useOrderStore }', 'import { formatOrderDate, ORDER_STATUSES, Order, OrderStatus, useOrderStore')
s = s.replace('else if (selectedMonthId) createOrder(selectedMonthId, payload);', 'else createOrder(selectedMonthId, payload);')
old = '<Text style={[styles.city, { color: colors.muted }]}>{order.city} {order.phone ? `· ${order.phone}` : ""}</Text>'
new = old + '<Text style={[styles.city, { color: colors.muted }]}>بەروار: {formatOrderDate(order.createdAt)}</Text>'
if old not in s: raise SystemExit('order card anchor not found')
orders.write_text(s.replace(old, new, 1))
print('routes, icon mapping, automatic month order creation, and order date updated')

using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

namespace BMailApp
{
    /// <summary>
    /// 如果文件名包含 _bmail，则返回 Visible，否则返回 Collapsed
    /// </summary>
    public class ContainsBmailToVisibilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            string? filename = value as string;
            if (!string.IsNullOrEmpty(filename) && filename.Contains("_bmail"))
                return Visibility.Visible;
            else
                return Visibility.Collapsed;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }

    /// <summary>
    /// 如果文件名不包含 _bmail，则返回 Visible，否则返回 Collapsed
    /// </summary>
    public class NotContainsBmailToVisibilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            string? filename = value as string;
            if (!string.IsNullOrEmpty(filename) && !filename.Contains("_bmail"))
                return Visibility.Visible;
            else
                return Visibility.Collapsed;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
